import type { DestinationState, OutputProfile } from "../../types";
import { buildFfmpegFanoutCommand } from "../ffmpeg/command-builder";
import { DestinationWorkerManager } from "../ffmpeg/destination-worker-manager";
import {
  getAllDestinations,
  insertDestination,
  updateDestination,
  deleteDestination,
} from "../dao/destinations";
import { getAllProfiles, insertProfile } from "../dao/profiles";
import { getAllStreams, updateStream } from "../dao/streams";
import {
  getRuntimeStore,
  appendRuntimeLog,
  createRuntimeId,
} from "../runtime-store";
import { getProviderAdapter } from "../provider-registry";
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
    this.log("info", "runtime", "Control service initialized");
  }

  listDestinations(): DestinationState[] {
    return structuredClone(getRuntimeStore().destinations);
  }
  listProfiles(): OutputProfile[] {
    return structuredClone(getRuntimeStore().profiles);
  }

  async createDestination(input: DestinationState): Promise<DestinationState> {
    const destination = { ...input, id: input.id || createRuntimeId("dst") };
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
    this.log("success", "destinations", `Configured ${destination.label}`);
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
    };
    const errors = getProviderAdapter(candidate.provider).validate(candidate);
    if (errors.length) throw new Error(errors.join("; "));
    await this.persistence.transaction((db) =>
      updateDestination(db, id, patch),
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
    this.log("warning", "destinations", `Removed ${removed.label}`);
    this.events.publish("destination.deleted", { id });
  }

  async createProfile(profile: OutputProfile): Promise<OutputProfile> {
    const record = { ...profile, id: profile.id || createRuntimeId("profile") };
    if (
      record.width < 16 ||
      record.height < 16 ||
      record.fps < 1 ||
      record.videoBitrate < 1 ||
      record.audioBitrate < 1
    )
      throw new Error("Invalid output profile dimensions or bitrate");
    await this.persistence.transaction((db) => insertProfile(db, record));
    getRuntimeStore().profiles.push(record);
    this.events.publish("profile.created", record);
    return structuredClone(record);
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
      this.log(
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
      this.log("info", "pipeline", "Pipeline stopped");
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
      this.log("warning", "watchdog", `Restarting pipeline: ${reason}`);
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
    this.log("error", "watchdog", reason);
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
  ): void {
    const entry = appendRuntimeLog(level, source, message);
    void this.persistence.transaction((db) =>
      db.run(
        "INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)",
        [entry.id, entry.timestamp, entry.level, entry.source, entry.message],
      ),
    );
    this.events.publish("log.created", entry);
  }
}
