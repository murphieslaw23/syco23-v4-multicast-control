import type { DestinationState, OutputProfile, SceneGraph, Template, TransmissionKit } from "../../contracts/domain";
import { buildFfmpegFanoutCommand } from "../ffmpeg/command-builder";
import { DestinationWorkerManager } from "../ffmpeg/destination-worker-manager";
import {
  getAllDestinations,
  insertDestination,
  updateDestination,
  deleteDestination,
} from "../dao/destinations";
import { deleteProfile, getAllProfiles, getProfileById, insertProfile, updateProfile } from "../dao/profiles";
import { deleteTemplate, getAllTemplates, getTemplateById, insertTemplate, updateTemplate } from "../dao/templates";
import { validateScene } from "../scene/scene-runtime";
import { getAssetById } from "../dao/userAssets";
import { getAllStreams, updateStream } from "../dao/streams";
import { deleteKit, generateKit, getAllKits, getKitById, insertKit, updateKit } from "../dao/transmissionKits";
import {
  getRuntimeStore,
  appendRuntimeLog,
  createRuntimeId,
} from "../runtime-store";
import { getProviderAdapter, validateProfileForProvider } from "../provider-registry";
import type { PersistentDatabase } from "../persistent-db";
import type { RuntimeEventBus } from "./event-bus";
import { EnvironmentSecretStore, type SecretStore } from "./secret-store";
import { AsyncCommandLock } from "./async-lock";
import { ApiError } from "./errors";

export interface StartPipelineRequest {
  inputUrl: string;
  destinationIds?: string[];
  streamKeys?: Record<string, string>;
  ffmpegPath?: string;
  title?: string;
  templateId?: string;
}

export class ControlService {
  readonly workers: DestinationWorkerManager;
  private readonly commandLock = new AsyncCommandLock();
  private activeRequest: StartPipelineRequest | null = null;
  private activeDestinationIds: string[] = [];
  private eventsBound = false;
  constructor(
    private readonly persistence: PersistentDatabase,
    readonly events: RuntimeEventBus,
    private readonly secrets: SecretStore = new EnvironmentSecretStore(),
  ) {
    this.workers = new DestinationWorkerManager(events, {
      maxRestarts: Number(process.env.SYCO_DESTINATION_MAX_RESTARTS || 3),
      baseBackoffMs: Number(process.env.SYCO_DESTINATION_BACKOFF_MS || 2000),
      cooldownMs: Number(process.env.SYCO_DESTINATION_COOLDOWN_MS || 60000),
    });
  }

  async initialize(): Promise<void> {
    await this.persistence.open();
    const store = getRuntimeStore();
    store.destinations = getAllDestinations(this.persistence.database);
    store.profiles = getAllProfiles(this.persistence.database);
    store.templates = getAllTemplates(this.persistence.database);
    store.streams = getAllStreams(this.persistence.database).map((item) => ({
      id: item.id,
      title: item.title,
      startedAt: item.startedAt,
      stoppedAt: item.endedAt,
    }));
    const logs = this.persistence.database.exec(
      "SELECT id,timestamp,level,source,message FROM log_entries ORDER BY timestamp DESC LIMIT 500",
    );
    store.logs =
      logs[0]?.values.map((row) => ({
        id: String(row[0]),
        timestamp: String(row[1]),
        level: row[2] as never,
        source: String(row[3]),
        message: String(row[4]),
      })) ?? [];
    if (!this.eventsBound) {
      this.eventsBound = true;
      this.events.subscribe((event) => {
        void this.handleRuntimeEvent(event.type, event.payload);
      });
    }
    await this.log("info", "runtime", "Control service initialized");
  }

  listDestinations(): DestinationState[] {
    return structuredClone(getRuntimeStore().destinations);
  }
  listProfiles(): OutputProfile[] {
    return structuredClone(getRuntimeStore().profiles);
  }
  listTemplates(): Template[] { return structuredClone(getRuntimeStore().templates); }
  listTransmissionKits(): TransmissionKit[] { return structuredClone(getAllKits(this.persistence.database)); }
  getTransmissionKit(id: string): TransmissionKit {
    const kit = getKitById(this.persistence.database, id);
    if (!kit) throw new ApiError("TRANSMISSION_KIT_NOT_FOUND", "Transmission kit not found", 404);
    return structuredClone(kit);
  }
  async generateTransmissionKit(input: { destinationId: string; templateId?: string; title?: string; artist?: string; show?: string; publicUrl?: string }): Promise<TransmissionKit> {
    const destination = getRuntimeStore().destinations.find((item) => item.id === input.destinationId);
    if (!destination) throw new ApiError("DESTINATION_NOT_FOUND", "Destination not found", 404);
    const template = input.templateId ? this.getTemplate(input.templateId) : null;
    if (template && template.provider !== destination.provider && template.provider !== "custom-rtmp") {
      throw new ApiError("TEMPLATE_PROVIDER_MISMATCH", `Template ${template.name} is not valid for ${destination.provider}`, 422);
    }
    const generated = generateKit({
      ...input,
      provider: destination.provider,
      destinationLabel: destination.label,
      template,
      title: input.title || getRuntimeStore().metadata.title,
      artist: input.artist || getRuntimeStore().metadata.artist,
      show: input.show || getRuntimeStore().metadata.show || undefined,
    });
    const now = new Date().toISOString();
    const kit: TransmissionKit = { ...generated, version: 1, createdAt: now, updatedAt: now };
    await this.persistence.transaction((db) => {
      insertKit(db, kit);
      updateDestination(db, destination.id, { transmissionKitId: kit.id });
    });
    destination.transmissionKitId = kit.id;
    this.events.publish("transmission-kit.generated", kit);
    await this.log("success", "transmission-kit", `Generated ${destination.provider} kit for ${destination.label}`);
    return structuredClone(kit);
  }
  async patchTransmissionKit(id: string, patch: Partial<Pick<TransmissionKit, "titleBlock" | "descriptionBlock" | "metadata" | "labels" | "launchNotes" | "checklist">>): Promise<TransmissionKit> {
    const current = this.getTransmissionKit(id);
    const updated: TransmissionKit = { ...current, ...patch, version: (current.version ?? 1) + 1, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
    await this.persistence.transaction((db) => updateKit(db, id, updated));
    const kit = this.getTransmissionKit(id);
    this.events.publish("transmission-kit.updated", kit);
    return kit;
  }
  async removeTransmissionKit(id: string): Promise<void> {
    const kit = this.getTransmissionKit(id);
    await this.persistence.transaction((db) => {
      deleteKit(db, id);
      updateDestination(db, kit.destinationId, { transmissionKitId: null });
    });
    const destination = getRuntimeStore().destinations.find((item) => item.id === kit.destinationId);
    if (destination?.transmissionKitId === id) destination.transmissionKitId = null;
    this.events.publish("transmission-kit.deleted", { id, destinationId: kit.destinationId });
  }
  getTemplate(id: string): Template {
    const template = getTemplateById(this.persistence.database, id);
    if (!template) throw new ApiError("TEMPLATE_NOT_FOUND", "Template not found", 404);
    return template;
  }
  async createTemplate(input: { name: string; provider: Template["provider"]; scene: SceneGraph; isCustom?: boolean }): Promise<Template> {
    const now = new Date().toISOString();
    const id = createRuntimeId("template");
    const template: Template = { id, name: String(input.name || "").trim(), provider: input.provider, scene: validateScene(input.scene), previewUrl: `/api/templates/${encodeURIComponent(id)}/preview.svg`, isCustom: input.isCustom !== false, version: 1, createdAt: now, updatedAt: now };
    if (!template.name) throw new ApiError("TEMPLATE_NAME_REQUIRED", "Template name is required");
    await this.persistence.transaction(db => insertTemplate(db, template));
    getRuntimeStore().templates.unshift(template);
    this.events.publish("template.created", template);
    return structuredClone(template);
  }
  async patchTemplate(id: string, patch: Partial<Pick<Template,"name"|"provider"|"scene">>): Promise<Template> {
    const current = this.getTemplate(id);
    const updated: Template = { ...current, ...patch, scene: patch.scene ? validateScene(patch.scene) : (current.scene || { width:1920,height:1080,background:"#000000",layers:[] }), version: (current.version || 1) + 1, updatedAt: new Date().toISOString() };
    if (!updated.name.trim()) throw new ApiError("TEMPLATE_NAME_REQUIRED", "Template name is required");
    await this.persistence.transaction(db => updateTemplate(db,id,{ name:updated.name, provider:updated.provider, scene:updated.scene, version:updated.version, updatedAt:updated.updatedAt }));
    const index=getRuntimeStore().templates.findIndex(item=>item.id===id); if(index>=0) getRuntimeStore().templates[index]=updated;
    this.events.publish("template.updated", updated); return structuredClone(updated);
  }
  async removeTemplate(id:string):Promise<void> { this.getTemplate(id); await this.persistence.transaction(db=>deleteTemplate(db,id)); getRuntimeStore().templates=getRuntimeStore().templates.filter(item=>item.id!==id); this.events.publish("template.deleted",{id}); }

  async createDestination(input: DestinationState): Promise<DestinationState> {
    const now = new Date().toISOString();
    const destination = { ...input, id: input.id || createRuntimeId("dst"), version: 1, createdAt: now, updatedAt: now };
    const errors = getProviderAdapter(destination.provider).validate(
      destination,
    );
    if (errors.length) throw new Error(errors.join("; "));
    if (
      getRuntimeStore().destinations.some((item) => item.id === destination.id)
    )
      throw new Error("Destination id already exists");
    await this.persistence.transaction((db) =>
      insertDestination(db, destination),
    );
    getRuntimeStore().destinations.push(destination);
    await this.log("success", "destinations", `Configured ${destination.label}`);
    this.events.publish("destination.created", destination);
    return structuredClone(destination);
  }

  async patchDestination(
    id: string,
    patch: Partial<DestinationState>,
  ): Promise<DestinationState> {
    const index = getRuntimeStore().destinations.findIndex(
      (item) => item.id === id,
    );
    if (index < 0) throw new Error("Destination not found");
    const candidate = {
      ...getRuntimeStore().destinations[index],
      ...patch,
      id,
      version: (getRuntimeStore().destinations[index].version ?? 1) + 1,
      createdAt: getRuntimeStore().destinations[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    const errors = getProviderAdapter(candidate.provider).validate(candidate);
    if (errors.length) throw new Error(errors.join("; "));
    await this.persistence.transaction((db) =>
      updateDestination(db, id, candidate),
    );
    getRuntimeStore().destinations[index] = candidate;
    this.events.publish("destination.updated", candidate);
    return structuredClone(candidate);
  }

  async removeDestination(id: string): Promise<void> {
    const index = getRuntimeStore().destinations.findIndex(
      (item) => item.id === id,
    );
    if (index < 0) throw new Error("Destination not found");
    await this.persistence.transaction((db) => deleteDestination(db, id));
    const [removed] = getRuntimeStore().destinations.splice(index, 1);
    await this.log("warning", "destinations", `Removed ${removed.label}`);
    this.events.publish("destination.deleted", { id });
  }

  getProfile(id: string): OutputProfile {
    const profile = getProfileById(this.persistence.database, id);
    if (!profile) throw new ApiError("PROFILE_NOT_FOUND", "Output profile not found", 404);
    return structuredClone(profile);
  }

  async createProfile(profile: OutputProfile): Promise<OutputProfile> {
    const now = new Date().toISOString();
    const record: OutputProfile = {
      ...profile,
      id: profile.id || createRuntimeId("profile"),
      name: String(profile.name || "").trim(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    if (!record.name) throw new ApiError("PROFILE_NAME_REQUIRED", "Profile name is required", 422);
    if (getProfileById(this.persistence.database, record.id)) throw new ApiError("PROFILE_EXISTS", "Output profile id already exists", 409);
    const errors = validateProfileForProvider(record);
    if (errors.length) throw new ApiError("PROFILE_INVALID", errors.join("; "), 422);
    await this.persistence.transaction((db) => insertProfile(db, record));
    getRuntimeStore().profiles.push(record);
    await this.log("success", "profiles", `Created ${record.name}`);
    this.events.publish("profile.created", record);
    return structuredClone(record);
  }

  async patchProfile(id: string, patch: Partial<Omit<OutputProfile, "id" | "version" | "createdAt" | "updatedAt">>): Promise<OutputProfile> {
    const current = this.getProfile(id);
    const updated: OutputProfile = {
      ...current,
      ...patch,
      id,
      name: String(patch.name ?? current.name).trim(),
      version: (current.version ?? 1) + 1,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    if (!updated.name) throw new ApiError("PROFILE_NAME_REQUIRED", "Profile name is required", 422);
    const errors = validateProfileForProvider(updated);
    if (errors.length) throw new ApiError("PROFILE_INVALID", errors.join("; "), 422);
    await this.persistence.transaction((db) => updateProfile(db, id, updated));
    const index = getRuntimeStore().profiles.findIndex((item) => item.id === id);
    if (index >= 0) getRuntimeStore().profiles[index] = updated;
    await this.log("success", "profiles", `Updated ${updated.name} to revision ${updated.version}`);
    this.events.publish("profile.updated", updated);
    return structuredClone(updated);
  }

  async removeProfile(id: string): Promise<void> {
    const profile = this.getProfile(id);
    const inUse = getRuntimeStore().destinations.find((destination) => destination.videoProfile === id || destination.audioProfile === id);
    if (inUse) throw new ApiError("PROFILE_IN_USE", `Profile is assigned to ${inUse.label}`, 409);
    await this.persistence.transaction((db) => deleteProfile(db, id));
    getRuntimeStore().profiles = getRuntimeStore().profiles.filter((item) => item.id !== id);
    await this.log("warning", "profiles", `Removed ${profile.name}`);
    this.events.publish("profile.deleted", { id });
  }

  async startPipeline(
    request: StartPipelineRequest,
  ): Promise<ReturnType<DestinationWorkerManager["aggregateSnapshot"]>> {
    return this.commandLock.run("pipeline.start", async () => {
      if (!request?.inputUrl?.trim())
        throw new ApiError("INPUT_URL_REQUIRED", "Input URL is required");
      const selected = request.destinationIds?.length
        ? getRuntimeStore().destinations.filter((item) =>
            request.destinationIds?.includes(item.id),
          )
        : getRuntimeStore().destinations;
      if (!selected.length)
        throw new ApiError(
          "DESTINATION_REQUIRED",
          "At least one destination is required",
        );
      const template = request.templateId ? this.getTemplate(request.templateId) : null;
      const sceneMetadata = { title: getRuntimeStore().metadata.title, artist: getRuntimeStore().metadata.artist, show: getRuntimeStore().metadata.show ?? undefined, listeners: getRuntimeStore().metadata.listeners ?? undefined };
      const sceneAssets = this.resolveSceneAssets(template?.scene);
      const streamKeys: Record<string, string> = {
        ...(request.streamKeys || {}),
      };
      for (const destination of selected) {
        if (!streamKeys[destination.streamKeyRef])
          streamKeys[destination.streamKeyRef] = await this.secrets.resolve(
            destination.streamKeyRef,
          );
      }
      const command = buildFfmpegFanoutCommand({
        inputUrl: request.inputUrl,
        destinations: selected,
        profiles: getRuntimeStore().profiles,
        streamKeys,
        ffmpegPath: request.ffmpegPath,
      });
      this.activeRequest = structuredClone(request);
      this.activeDestinationIds = selected.map((item) => item.id);
      await this.setDestinationRuntimeState(this.activeDestinationIds, {
        status: "connecting",
        health: "degraded",
        lastError: null,
      });
      await this.workers.start({
        inputUrl: request.inputUrl,
        destinations: selected,
        profiles: getRuntimeStore().profiles,
        streamKeys,
        ffmpegPath: request.ffmpegPath,
        scene: template?.scene,
        sceneMetadata,
        sceneAssets,
      });
      const session = {
        id: createRuntimeId("session"),
        title: request.title || "SYCO23 Transmission",
        startedAt: new Date().toISOString(),
        stoppedAt: null,
      };
      await this.persistence.transaction((db) =>
        db.run(
          "INSERT INTO streams (id,title,artist,started_at,ended_at,status) VALUES (?,?,?,?,?,?)",
          [session.id, session.title, "", session.startedAt, null, "online"],
        ),
      );
      getRuntimeStore().streams.unshift(session);
      getRuntimeStore().status = {
        live: true,
        pipelineHealth: "ok",
        ingestStatus: "connected",
      };
      await this.log(
        "success",
        "pipeline",
        `Started ${session.title} with ${command.outputCount} output(s)`,
      );
      return this.workers.aggregateSnapshot();
    });
  }

  async stopPipeline(): Promise<
    ReturnType<DestinationWorkerManager["aggregateSnapshot"]>
  > {
    return this.commandLock.run("pipeline.stop", async () => {
      await this.workers.stop();
      const active = getRuntimeStore().streams.find(
        (item) => item.stoppedAt === null,
      );
      if (active) {
        active.stoppedAt = new Date().toISOString();
        await this.persistence.transaction((db) =>
          updateStream(db, active.id, {
            endedAt: active.stoppedAt,
            status: "offline",
          }),
        );
      }
      getRuntimeStore().status = {
        live: false,
        pipelineHealth: "ok",
        ingestStatus: "idle",
      };
      await this.setDestinationRuntimeState(this.activeDestinationIds, {
        status: "configured",
        health: "ok",
        lastError: null,
      });
      this.activeRequest = null;
      this.activeDestinationIds = [];
      await this.log("info", "pipeline", "Pipeline stopped");
      return this.workers.aggregateSnapshot();
    });
  }

  async recoverPipeline(reason: string): Promise<void> {
    return this.commandLock.run("pipeline.recover", async () => {
      const request = this.activeRequest
        ? structuredClone(this.activeRequest)
        : null;
      if (!request)
        throw new ApiError(
          "RECOVERY_CONTEXT_MISSING",
          "No active pipeline request is available for recovery",
        );
      await this.workers.stop();
      await this.log("warning", "watchdog", `Restarting pipeline: ${reason}`);
      const selected = request.destinationIds?.length
        ? getRuntimeStore().destinations.filter((item) =>
            request.destinationIds?.includes(item.id),
          )
        : getRuntimeStore().destinations;
      const streamKeys: Record<string, string> = {
        ...(request.streamKeys || {}),
      };
      for (const destination of selected) {
        if (!streamKeys[destination.streamKeyRef])
          streamKeys[destination.streamKeyRef] = await this.secrets.resolve(
            destination.streamKeyRef,
          );
      }
      const command = buildFfmpegFanoutCommand({
        inputUrl: request.inputUrl,
        destinations: selected,
        profiles: getRuntimeStore().profiles,
        streamKeys,
        ffmpegPath: request.ffmpegPath,
      });
      const template = request.templateId ? this.getTemplate(request.templateId) : null;
      const sceneMetadata = { title: getRuntimeStore().metadata.title, artist: getRuntimeStore().metadata.artist, show: getRuntimeStore().metadata.show ?? undefined, listeners: getRuntimeStore().metadata.listeners ?? undefined };
      const sceneAssets = this.resolveSceneAssets(template?.scene);
      await this.setDestinationRuntimeState(
        selected.map((item) => item.id),
        { status: "connecting", health: "degraded", lastError: reason },
      );
      await this.workers.start({
        inputUrl: request.inputUrl,
        destinations: selected,
        profiles: getRuntimeStore().profiles,
        streamKeys,
        ffmpegPath: request.ffmpegPath,
        scene: template?.scene,
        sceneMetadata,
        sceneAssets,
      });
      getRuntimeStore().status = {
        live: true,
        pipelineHealth: "degraded",
        ingestStatus: "degraded",
      };
    });
  }

  async markPipelineFailed(reason: string): Promise<void> {
    getRuntimeStore().status = {
      live: false,
      pipelineHealth: "failed",
      ingestStatus: "failed",
    };
    await this.setDestinationRuntimeState(this.activeDestinationIds, {
      status: "cooldown",
      health: "failed",
      lastError: reason,
    });
    const active = getRuntimeStore().streams.find(
      (item) => item.stoppedAt === null,
    );
    if (active) {
      active.stoppedAt = new Date().toISOString();
      await this.persistence.transaction((db) =>
        updateStream(db, active.id, {
          endedAt: active.stoppedAt,
          status: "offline",
        }),
      );
    }
    await this.log("error", "watchdog", reason);
  }

  private async handleRuntimeEvent(
    type: string,
    payload: unknown,
  ): Promise<void> {
    const destinationId =
      typeof payload === "object" && payload && "destinationId" in payload
        ? String((payload as { destinationId: unknown }).destinationId)
        : null;
    if (type === "destination.worker.started" && destinationId) {
      await this.setDestinationRuntimeState([destinationId], {
        status: "live",
        health: "ok",
        lastHandshakeAt: new Date().toISOString(),
        lastError: null,
      });
      this.refreshAggregateStatus();
    } else if (type === "destination.worker.failed" && destinationId) {
      const reason =
        "error" in (payload as object)
          ? String((payload as { error: unknown }).error)
          : "FFmpeg worker failed";
      await this.setDestinationRuntimeState([destinationId], {
        status: "degraded",
        health: "failed",
        lastError: reason,
      });
      this.refreshAggregateStatus();
    } else if (
      type === "destination.worker.recovery.scheduled" &&
      destinationId
    ) {
      const reason =
        "reason" in (payload as object)
          ? String((payload as { reason: unknown }).reason)
          : "Worker recovery scheduled";
      await this.setDestinationRuntimeState([destinationId], {
        status: "degraded",
        health: "degraded",
        lastError: reason,
      });
      this.refreshAggregateStatus();
    } else if (type === "destination.worker.cooldown" && destinationId) {
      const reason =
        "reason" in (payload as object)
          ? String((payload as { reason: unknown }).reason)
          : "Worker recovery exhausted";
      await this.setDestinationRuntimeState([destinationId], {
        status: "cooldown",
        health: "failed",
        lastError: reason,
      });
      this.refreshAggregateStatus();
       } else if (type === "provider.probe.updated" && destinationId) {
      const probe = payload as { status?: string; message?: string };
      const healthy = probe.status === "healthy";
      await this.setDestinationRuntimeState([destinationId], {
        status: healthy ? "live" : "degraded",
        health: healthy ? "ok" : "degraded",
        lastHandshakeAt: healthy ? new Date().toISOString() : undefined,
        lastError: healthy ? null : probe.message || "Provider did not acknowledge stream",
      });
      this.refreshAggregateStatus();
    } else if (type === "provider.probe.failed" && destinationId) {
      const probe = payload as { message?: string };
      await this.setDestinationRuntimeState([destinationId], {
        status: "degraded",
        health: "failed",
        lastError: probe.message || "Provider probe failed",
      });
      this.refreshAggregateStatus();
    }
  }

  private async setDestinationRuntimeState(
    ids: string[],
    patch: Partial<DestinationState>,
  ): Promise<void> {
    if (!ids.length) return;
    await this.persistence.transaction((db) => {
      for (const id of ids) updateDestination(db, id, patch);
    });
    for (const id of ids) {
      const index = getRuntimeStore().destinations.findIndex(
        (item) => item.id === id,
      );
      if (index >= 0)
        getRuntimeStore().destinations[index] = {
          ...getRuntimeStore().destinations[index],
          ...patch,
        };
    }
    this.events.publish("destinations.runtime.updated", { ids, patch });
  }

  private refreshAggregateStatus(): void {
    const aggregate = this.workers.aggregateSnapshot();
    const liveWorkers = aggregate.workers.filter(
      (worker) => worker.state === "running",
    ).length;
    const totalWorkers = aggregate.workers.length;
    getRuntimeStore().status = {
      live: liveWorkers > 0,
      pipelineHealth: aggregate.health,
      ingestStatus:
        totalWorkers === 0
          ? "idle"
          : aggregate.health === "ok"
            ? "connected"
            : aggregate.health === "degraded"
              ? "degraded"
              : "failed",
    };
  }

  private resolveSceneAssets(scene?: SceneGraph): Record<string,string> {
    const result:Record<string,string> = {};
    for (const layer of scene?.layers || []) {
      if (layer.type !== "asset" || !layer.assetId) continue;
      const asset = getAssetById(this.persistence.database, layer.assetId);
      if (!asset) throw new ApiError("SCENE_ASSET_NOT_FOUND", `Scene asset ${layer.assetId} was not found`, 422);
      result[layer.assetId] = asset.storagePath;
    }
    return result;
  }

  status() {
    return {
      ...getRuntimeStore().status,
      supervisor: this.workers.aggregateSnapshot(),
      destinations: getRuntimeStore().destinations.length,
    };
  }

  destinationWorkers() {
    return this.workers.snapshots();
  }

  sessions(limit = 200) {
    return structuredClone(
      getRuntimeStore().streams.slice(0, Math.max(1, Math.min(limit, 1000))),
    );
  }

  logs(limit = 200) {
    return structuredClone(
      getRuntimeStore().logs.slice(0, Math.max(1, Math.min(limit, 500))),
    );
  }

  private log(
    level: "info" | "warning" | "error" | "success" | "debug",
    source: string,
    message: string,
  ): Promise<void> {
    const entry = appendRuntimeLog(level, source, message);
    return this.persistence.transaction((db) =>
      db.run(
        "INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)",
        [entry.id, entry.timestamp, entry.level, entry.source, entry.message],
      ),
    ).then(() => { this.events.publish("log.created", entry); });
  }
}
