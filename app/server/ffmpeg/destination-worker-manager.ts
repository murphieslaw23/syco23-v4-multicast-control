import type {
  DestinationState,
  OutputProfile,
  PipelineHealth,
  SceneGraph,
} from "../../types";
import type { RuntimeEventBus } from "../runtime/event-bus";
import type { FfmpegCommand } from "./command-builder";
import { buildFfmpegFanoutCommand } from "./command-builder";
import {
  FfmpegProcessSupervisor,
  type ProcessMetrics,
} from "./process-supervisor";

export interface DestinationWorkerConfig {
  maxRestarts: number;
  baseBackoffMs: number;
  cooldownMs: number;
}

export interface DestinationWorkerSnapshot {
  destinationId: string;
  label: string;
  state: string;
  health: PipelineHealth;
  pid: number | null;
  startedAt: string | null;
  lastProgressAt: string | null;
  restartCount: number;
  cooldownUntil: string | null;
  lastError: string | null;
  metrics: ProcessMetrics;
}

interface WorkerRecord {
  destination: DestinationState;
  command: FfmpegCommand;
  supervisor: FfmpegProcessSupervisor;
  restartCount: number;
  cooldownUntil: number;
  stopping: boolean;
  retryTimer: NodeJS.Timeout | null;
}

const DEFAULTS: DestinationWorkerConfig = {
  maxRestarts: 3,
  baseBackoffMs: 2_000,
  cooldownMs: 60_000,
};

export class DestinationWorkerManager {
  private readonly workers = new Map<string, WorkerRecord>();
  private running = false;

  constructor(
    private readonly events: RuntimeEventBus,
    private readonly config: DestinationWorkerConfig = DEFAULTS,
  ) {}

  async start(options: {
    inputUrl: string;
    destinations: DestinationState[];
    profiles: OutputProfile[];
    streamKeys: Record<string, string>;
    ffmpegPath?: string;
    scene?: SceneGraph;
    sceneMetadata?: Record<string, string | number | undefined>;
    sceneAssets?: Record<string, string>;
  }): Promise<void> {
    if (this.running || this.workers.size)
      throw new Error("Destination workers are already active");
    this.running = true;
    for (const destination of options.destinations) {
      const command = buildFfmpegFanoutCommand({
        inputUrl: options.inputUrl,
        destinations: [destination],
        profiles: options.profiles,
        streamKeys: options.streamKeys,
        ffmpegPath: options.ffmpegPath,
        scene: options.scene,
        sceneMetadata: options.sceneMetadata,
        sceneAssets: options.sceneAssets,
      });
      const supervisor = new FfmpegProcessSupervisor(this.events, {
        destinationId: destination.id,
        eventPrefix: "destination.worker",
      });
      const record: WorkerRecord = {
        destination: structuredClone(destination),
        command,
        supervisor,
        restartCount: 0,
        cooldownUntil: 0,
        stopping: false,
        retryTimer: null,
      };
      this.workers.set(destination.id, record);
      this.bind(record);
      this.launch(record);
    }
    this.events.publish("destination.workers.started", {
      destinationIds: [...this.workers.keys()],
    });
  }

  async stop(destinationId?: string): Promise<void> {
    const records = destinationId
      ? [this.requireWorker(destinationId)]
      : [...this.workers.values()];
    for (const record of records) {
      record.stopping = true;
      if (record.retryTimer) clearTimeout(record.retryTimer);
      record.retryTimer = null;
      await record.supervisor.stop();
      if (destinationId) this.workers.delete(destinationId);
    }
    if (!destinationId) {
      this.workers.clear();
      this.running = false;
      this.events.publish("destination.workers.stopped", {});
    }
  }

  async restart(destinationId: string, reason: string): Promise<void> {
    const record = this.requireWorker(destinationId);
    record.stopping = false;
    if (record.retryTimer) clearTimeout(record.retryTimer);
    await record.supervisor.stop(3_000);
    this.events.publish("destination.worker.restart.manual", {
      destinationId,
      reason,
    });
    this.launch(record);
  }

  snapshots(): DestinationWorkerSnapshot[] {
    return [...this.workers.values()].map((record) =>
      this.snapshotRecord(record),
    );
  }

  aggregateSnapshot() {
    const workers = this.snapshots();
    const active = workers.filter((item) =>
      ["preparing", "starting", "running", "stopping"].includes(item.state),
    );
    const running = workers.filter((item) => item.state === "running");
    const failed = workers.filter((item) =>
      ["failed", "cooldown"].includes(item.state),
    );
    const health: PipelineHealth =
      failed.length === 0 ? "ok" : running.length > 0 ? "degraded" : "failed";
    const state =
      workers.length === 0
        ? "idle"
        : running.length > 0
          ? "running"
          : active.length > 0
            ? "starting"
            : "failed";
    const lastProgress =
      workers
        .map((item) => item.lastProgressAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;
    const firstStarted =
      workers
        .map((item) => item.startedAt)
        .filter(Boolean)
        .sort()
        .at(0) ?? null;
    const metrics = workers.reduce<ProcessMetrics>(
      (total, item) => ({
        frame: Math.max(total.frame, item.metrics.frame),
        fps: total.fps + item.metrics.fps,
        bitrateKbps: total.bitrateKbps + item.metrics.bitrateKbps,
        speed: total.speed + item.metrics.speed,
        outTimeMs: Math.max(total.outTimeMs, item.metrics.outTimeMs),
      }),
      { frame: 0, fps: 0, bitrateKbps: 0, speed: 0, outTimeMs: 0 },
    );
    return {
      state,
      health,
      pid: workers.length === 1 ? workers[0].pid : null,
      startedAt: firstStarted,
      stoppedAt: state === "idle" ? new Date().toISOString() : null,
      restartCount: workers.reduce((sum, item) => sum + item.restartCount, 0),
      lastError:
        failed
          .map((item) => `${item.label}: ${item.lastError || "failed"}`)
          .join("; ") || null,
      lastProgressAt: lastProgress,
      metrics,
      workers,
    };
  }

  private bind(record: WorkerRecord): void {
    record.supervisor.onTerminal((outcome) => {
      if (record.stopping || outcome.kind === "completed") return;
      void this.scheduleRecovery(
        record,
        outcome.error || "Worker exited unexpectedly",
      );
    });
  }

  private launch(record: WorkerRecord): void {
    if (Date.now() < record.cooldownUntil) return;
    try {
      const state = record.supervisor.snapshot().state;
      if (state === "failed") record.supervisor.reset();
      record.supervisor.start(record.command);
    } catch (error) {
      void this.scheduleRecovery(
        record,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async scheduleRecovery(
    record: WorkerRecord,
    reason: string,
  ): Promise<void> {
    if (record.stopping || record.retryTimer) return;
    if (record.restartCount >= this.config.maxRestarts) {
      record.cooldownUntil = Date.now() + this.config.cooldownMs;
      this.events.publish("destination.worker.cooldown", {
        destinationId: record.destination.id,
        label: record.destination.label,
        reason,
        restartCount: record.restartCount,
        cooldownUntil: new Date(record.cooldownUntil).toISOString(),
      });
      return;
    }
    const attempt = ++record.restartCount;
    const delay = this.config.baseBackoffMs * 2 ** (attempt - 1);
    this.events.publish("destination.worker.recovery.scheduled", {
      destinationId: record.destination.id,
      reason,
      attempt,
      delay,
    });
    record.retryTimer = setTimeout(() => {
      record.retryTimer = null;
      if (record.stopping) return;
      this.events.publish("destination.worker.recovery.started", {
        destinationId: record.destination.id,
        reason,
        attempt,
      });
      this.launch(record);
    }, delay);
    record.retryTimer.unref?.();
  }

  private snapshotRecord(record: WorkerRecord): DestinationWorkerSnapshot {
    const snapshot = record.supervisor.snapshot();
    return {
      destinationId: record.destination.id,
      label: record.destination.label,
      state: Date.now() < record.cooldownUntil ? "cooldown" : snapshot.state,
      health: Date.now() < record.cooldownUntil ? "failed" : snapshot.health,
      pid: snapshot.pid,
      startedAt: snapshot.startedAt,
      lastProgressAt: snapshot.lastProgressAt,
      restartCount: record.restartCount,
      cooldownUntil: record.cooldownUntil
        ? new Date(record.cooldownUntil).toISOString()
        : null,
      lastError: snapshot.lastError,
      metrics: snapshot.metrics,
    };
  }

  private requireWorker(destinationId: string): WorkerRecord {
    const record = this.workers.get(destinationId);
    if (!record)
      throw new Error(`Destination worker ${destinationId} not found`);
    return record;
  }
}
