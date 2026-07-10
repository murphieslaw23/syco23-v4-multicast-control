import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { WebSocketServer } from "ws";
import { PersistentDatabase } from "./persistent-db";
import { RuntimeEventBus } from "./runtime/event-bus";
import { ControlService } from "./runtime/control-service";
import {
  OperationsStore,
  type Role,
  type ScheduleJob,
} from "./runtime/operations";
import { SchedulerRuntime } from "./runtime/scheduler";
import { ApiError, asApiError } from "./runtime/errors";
import { WebSocketTicketStore } from "./runtime/ws-tickets";
import { WatchdogRuntime } from "./runtime/watchdog-runtime";
import { MetadataRuntime } from "./runtime/metadata-runtime";
import type { DestinationState, OutputProfile } from "../types";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const distRoot = resolve(process.cwd(), "dist");
const persistence = new PersistentDatabase(process.env.SYCO_DB_PATH);
const events = new RuntimeEventBus();
const service = new ControlService(persistence, events);
const operations = new OperationsStore(persistence, events);
const scheduler = new SchedulerRuntime(operations, service, events);
const wsTickets = new WebSocketTicketStore();
const watchdog = new WatchdogRuntime(service, persistence, operations, events, {
  intervalMs: Number(process.env.SYCO_WATCHDOG_INTERVAL_MS || 2000),
  startupGraceMs: Number(process.env.SYCO_WATCHDOG_STARTUP_GRACE_MS || 20000),
  progressTimeoutMs: Number(
    process.env.SYCO_WATCHDOG_PROGRESS_TIMEOUT_MS || 15000,
  ),
  maxRestarts: Number(process.env.SYCO_WATCHDOG_MAX_RESTARTS || 3),
  baseBackoffMs: Number(process.env.SYCO_WATCHDOG_BACKOFF_MS || 2000),
  cooldownMs: Number(process.env.SYCO_WATCHDOG_COOLDOWN_MS || 60000),
});
const metadata = new MetadataRuntime(persistence, events, {
  baseUrl: process.env.SYCO_AZURACAST_URL || "",
  station: process.env.SYCO_AZURACAST_STATION || "",
  apiKey: process.env.SYCO_AZURACAST_API_KEY,
  pollIntervalMs: Number(process.env.SYCO_METADATA_POLL_MS || 15000),
  timeoutMs: Number(process.env.SYCO_METADATA_TIMEOUT_MS || 5000),
  staleAfterMs: Number(process.env.SYCO_METADATA_STALE_MS || 60000),
  maxBackoffMs: Number(process.env.SYCO_METADATA_MAX_BACKOFF_MS || 300000),
});
const backupRoot = resolve(
  process.env.SYCO_BACKUP_DIR || join(process.cwd(), "data/backups"),
);

interface AuthContext {
  actor: string;
  role: Role;
}
const rank: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

function json(
  response: ServerResponse,
  status: number,
  data: unknown,
  requestId?: string,
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(requestId ? { "x-request-id": requestId } : {}),
  });
  response.end(status === 204 ? undefined : JSON.stringify(data));
}

async function body(
  request: IncomingMessage,
  maxBytes = 1_000_000,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    length += bytes.length;
    if (length > maxBytes)
      throw new Error(`Request body exceeds ${maxBytes} bytes`);
    chunks.push(bytes);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function auth(request: IncomingMessage): AuthContext | null {
  const header = request.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const configured: Array<[string | undefined, AuthContext]> = [
    [
      process.env.SYCO_ADMIN_TOKEN || process.env.SYCO_API_TOKEN,
      { actor: "api-admin", role: "admin" },
    ],
    [
      process.env.SYCO_OPERATOR_TOKEN,
      { actor: "api-operator", role: "operator" },
    ],
    [process.env.SYCO_VIEWER_TOKEN, { actor: "api-viewer", role: "viewer" }],
  ];
  const active = configured.filter(([token]) => Boolean(token));
  if (!active.length) return { actor: "local-dev", role: "admin" };
  return active.find(([token]) => token === supplied)?.[1] ?? null;
}

function requireRole(context: AuthContext, role: Role): void {
  if (rank[context.role] < rank[role])
    throw new Error(`Forbidden: ${role} role required`);
}

function mime(path: string): string {
  return (
    (
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".json": "application/json",
      } as Record<string, string>
    )[extname(path)] || "application/octet-stream"
  );
}

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const raw = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`,
  ).pathname;
  const safe = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, "");
  let path = join(distRoot, safe === "/" ? "index.html" : safe);
  if (
    !path.startsWith(distRoot) ||
    !existsSync(path) ||
    (await stat(path)).isDirectory()
  )
    path = join(distRoot, "index.html");
  response.writeHead(200, {
    "content-type": mime(path),
    "cache-control": path.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
  });
  createReadStream(path).pipe(response);
}

async function audited<T>(
  context: AuthContext,
  action: string,
  resource: string,
  resourceId: string | null,
  operation: () => Promise<T> | T,
): Promise<T> {
  try {
    const result = await operation();
    await operations.audit(
      context.actor,
      context.role,
      action,
      resource,
      resourceId,
      "success",
    );
    return result;
  } catch (error) {
    await operations.audit(
      context.actor,
      context.role,
      action,
      resource,
      resourceId,
      "failure",
      { error: error instanceof Error ? error.message : String(error) },
    );
    throw error;
  }
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const requestId = String(
    request.headers["x-request-id"] || crypto.randomUUID(),
  ).slice(0, 128);
  response.setHeader("x-request-id", requestId);
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`,
  );
  if (!url.pathname.startsWith("/api/")) return serveStatic(request, response);
  if (request.method === "GET" && url.pathname === "/api/health")
    return json(
      response,
      200,
      {
        ok: true,
        data: {
          live: true,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      },
      requestId,
    );
  if (request.method === "GET" && url.pathname === "/api/health/ready") {
    try {
      persistence.database.exec("SELECT 1");
      return json(
        response,
        200,
        {
          ok: true,
          data: {
            ready: true,
            database: "ok",
            ffmpeg: service.workers.aggregateSnapshot().state,
          },
        },
        requestId,
      );
    } catch (error) {
      return json(
        response,
        503,
        {
          ok: false,
          error: {
            code: "NOT_READY",
            message: error instanceof Error ? error.message : String(error),
            requestId,
          },
        },
        requestId,
      );
    }
  }
  const context = auth(request);
  if (!context)
    return json(
      response,
      401,
      {
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId },
      },
      requestId,
    );
  try {
    if (request.method === "GET" && url.pathname === "/api/me")
      return json(response, 200, { ok: true, data: context });
    if (request.method === "POST" && url.pathname === "/api/events/ticket")
      return json(
        response,
        201,
        { ok: true, data: wsTickets.issue(context) },
        requestId,
      );
    if (request.method === "GET" && url.pathname === "/api/metadata")
      return json(
        response,
        200,
        { ok: true, data: metadata.snapshot() },
        requestId,
      );
    if (request.method === "GET" && url.pathname === "/api/metadata/stats")
      return json(
        response,
        200,
        { ok: true, data: metadata.stats() },
        requestId,
      );
    if (request.method === "GET" && url.pathname === "/api/metadata/health")
      return json(
        response,
        200,
        { ok: true, data: metadata.snapshot().health },
        requestId,
      );
    if (request.method === "POST" && url.pathname === "/api/metadata/refresh") {
      requireRole(context, "operator");
      return json(
        response,
        200,
        { ok: true, data: await metadata.poll() },
        requestId,
      );
    }
    if (request.method === "GET" && url.pathname === "/api/status")
      return json(response, 200, {
        ok: true,
        data: { ...service.status(), watchdog: watchdog.snapshot() },
      });
    if (request.method === "GET" && url.pathname === "/api/destination-workers")
      return json(
        response,
        200,
        { ok: true, data: service.destinationWorkers() },
        requestId,
      );
    const workerEventsMatch = url.pathname.match(
      /^\/api\/destination-workers\/([^/]+)\/events$/,
    );
    if (workerEventsMatch && request.method === "GET") {
      const id = decodeURIComponent(workerEventsMatch[1]);
      const limit = Math.max(
        1,
        Math.min(Number(url.searchParams.get("limit") || 100), 500),
      );
      const result = persistence.database.exec(
        "SELECT id,destination_id,timestamp,event_type,state,message,detail FROM destination_worker_events WHERE destination_id=? ORDER BY timestamp DESC LIMIT ?",
        [id, limit],
      );
      const data =
        result[0]?.values.map((row) => ({
          id: String(row[0]),
          destinationId: String(row[1]),
          timestamp: String(row[2]),
          eventType: String(row[3]),
          state: row[4] ? String(row[4]) : null,
          message: row[5] ? String(row[5]) : null,
          detail: JSON.parse(String(row[6] || "{}")),
        })) ?? [];
      return json(response, 200, { ok: true, data }, requestId);
    }
    const workerRestartMatch = url.pathname.match(
      /^\/api\/destination-workers\/([^/]+)\/restart$/,
    );
    if (workerRestartMatch && request.method === "POST") {
      requireRole(context, "operator");
      const id = decodeURIComponent(workerRestartMatch[1]);
      await audited(context, "restart", "destination-worker", id, () =>
        service.workers.restart(id, "Operator requested restart"),
      );
      return json(
        response,
        202,
        {
          ok: true,
          data: service
            .destinationWorkers()
            .find((item) => item.destinationId === id),
        },
        requestId,
      );
    }
    if (request.method === "GET" && url.pathname === "/api/watchdog/events") {
      const limit = Math.max(
        1,
        Math.min(Number(url.searchParams.get("limit") || 100), 500),
      );
      const result = persistence.database.exec(
        "SELECT id,timestamp,source,severity,message FROM watchdog_events ORDER BY timestamp DESC LIMIT ?",
        [limit],
      );
      const data =
        result[0]?.values.map((row) => ({
          id: String(row[0]),
          timestamp: String(row[1]),
          source: String(row[2]),
          severity: String(row[3]),
          message: String(row[4]),
        })) ?? [];
      return json(response, 200, { ok: true, data });
    }
    if (request.method === "GET" && url.pathname === "/api/events")
      return json(response, 200, {
        ok: true,
        data: events.history(Number(url.searchParams.get("limit") || 100)),
      });
    if (request.method === "GET" && url.pathname === "/api/logs")
      return json(response, 200, {
        ok: true,
        data: service.logs(Number(url.searchParams.get("limit") || 200)),
      });
    if (request.method === "GET" && url.pathname === "/api/sessions")
      return json(response, 200, {
        ok: true,
        data: service.sessions(Number(url.searchParams.get("limit") || 200)),
      });
    if (request.method === "GET" && url.pathname === "/api/audit") {
      requireRole(context, "admin");
      return json(response, 200, {
        ok: true,
        data: operations.listAudit(
          Number(url.searchParams.get("limit") || 200),
        ),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/destinations")
      return json(response, 200, {
        ok: true,
        data: service.listDestinations(),
      });
    if (request.method === "POST" && url.pathname === "/api/destinations") {
      requireRole(context, "admin");
      const input = (await body(request)) as DestinationState;
      return json(response, 201, {
        ok: true,
        data: await audited(
          context,
          "create",
          "destination",
          input.id || null,
          () => service.createDestination(input),
        ),
      });
    }
    const destinationMatch = url.pathname.match(
      /^\/api\/destinations\/([^/]+)$/,
    );
    if (destinationMatch && request.method === "PATCH") {
      requireRole(context, "admin");
      const id = decodeURIComponent(destinationMatch[1]);
      const patch = (await body(request)) as Partial<DestinationState>;
      return json(response, 200, {
        ok: true,
        data: await audited(context, "update", "destination", id, () =>
          service.patchDestination(id, patch),
        ),
      });
    }
    if (destinationMatch && request.method === "DELETE") {
      requireRole(context, "admin");
      const id = decodeURIComponent(destinationMatch[1]);
      await audited(context, "delete", "destination", id, () =>
        service.removeDestination(id),
      );
      return json(response, 204, null);
    }

    if (request.method === "GET" && url.pathname === "/api/profiles")
      return json(response, 200, { ok: true, data: service.listProfiles() });
    if (request.method === "POST" && url.pathname === "/api/profiles") {
      requireRole(context, "admin");
      const input = (await body(request)) as OutputProfile;
      return json(response, 201, {
        ok: true,
        data: await audited(
          context,
          "create",
          "profile",
          input.id || null,
          () => service.createProfile(input),
        ),
      });
    }

    if (request.method === "POST" && url.pathname === "/api/pipeline/start") {
      requireRole(context, "operator");
      const input = (await body(request)) as never;
      return json(response, 202, {
        ok: true,
        data: await audited(context, "start", "pipeline", null, () =>
          service.startPipeline(input),
        ),
      });
    }
    if (request.method === "POST" && url.pathname === "/api/pipeline/stop") {
      requireRole(context, "operator");
      return json(response, 200, {
        ok: true,
        data: await audited(context, "stop", "pipeline", null, () =>
          service.stopPipeline(),
        ),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/schedules")
      return json(response, 200, {
        ok: true,
        data: operations.listSchedules(),
      });
    if (request.method === "POST" && url.pathname === "/api/schedules") {
      requireRole(context, "operator");
      const input = (await body(request)) as Omit<
        ScheduleJob,
        "id" | "lastRunAt" | "failureCount" | "lastError"
      >;
      return json(response, 201, {
        ok: true,
        data: await audited(context, "create", "schedule", null, () =>
          operations.createSchedule(input),
        ),
      });
    }
    const scheduleMatch = url.pathname.match(/^\/api\/schedules\/([^/]+)$/);
    if (scheduleMatch && request.method === "DELETE") {
      requireRole(context, "operator");
      const id = decodeURIComponent(scheduleMatch[1]);
      await audited(context, "delete", "schedule", id, () =>
        operations.deleteSchedule(id),
      );
      return json(response, 204, null);
    }

    if (request.method === "GET" && url.pathname === "/api/incidents")
      return json(response, 200, {
        ok: true,
        data: operations.listIncidents(),
      });
    const incidentMatch = url.pathname.match(
      /^\/api\/incidents\/([^/]+)\/resolve$/,
    );
    if (incidentMatch && request.method === "POST") {
      requireRole(context, "operator");
      const id = decodeURIComponent(incidentMatch[1]);
      const input = (await body(request)) as { resolution?: string };
      return json(response, 200, {
        ok: true,
        data: await audited(context, "resolve", "incident", id, () =>
          operations.resolveIncident(id, input.resolution || ""),
        ),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/backups") {
      requireRole(context, "admin");
      await mkdir(backupRoot, { recursive: true });
      const files = (await readdir(backupRoot))
        .filter((name) => /^syco23-[A-Za-z0-9._-]+\.sqlite$/.test(name))
        .sort()
        .reverse();
      return json(
        response,
        200,
        { ok: true, data: files.map((id) => ({ id })) },
        requestId,
      );
    }
    if (request.method === "POST" && url.pathname === "/api/backups") {
      requireRole(context, "admin");
      const id = `syco23-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`;
      await mkdir(backupRoot, { recursive: true });
      await audited(context, "create", "backup", id, () =>
        persistence.backup(join(backupRoot, id)),
      );
      return json(response, 201, { ok: true, data: { id } }, requestId);
    }
    if (request.method === "POST" && url.pathname === "/api/backups/restore") {
      requireRole(context, "admin");
      const input = (await body(request)) as { id?: string };
      if (!input.id || !/^syco23-[A-Za-z0-9._-]+\.sqlite$/.test(input.id))
        throw new ApiError(
          "BACKUP_ID_INVALID",
          "A valid backup id is required",
        );
      const bytes = await readFile(join(backupRoot, input.id));
      if (
        bytes.length < 16 ||
        bytes.subarray(0, 15).toString("utf8") !== "SQLite format 3"
      )
        throw new ApiError(
          "BACKUP_FORMAT_INVALID",
          "Backup is not a valid SQLite database",
        );
      await audited(context, "restore", "backup", input.id, () =>
        persistence.restore(new Uint8Array(bytes)),
      );
      await service.initialize();
      return json(
        response,
        200,
        { ok: true, data: { restored: true, id: input.id } },
        requestId,
      );
    }
    if (request.method === "GET" && url.pathname === "/api/backups/export") {
      requireRole(context, "admin");
      const path = join(
        process.cwd(),
        "data",
        `.export-${crypto.randomUUID()}.sqlite`,
      );
      await persistence.backup(path);
      const bytes = await readFile(path);
      await unlink(path).catch(() => undefined);
      response.writeHead(200, {
        "content-type": "application/vnd.sqlite3",
        "content-disposition": 'attachment; filename="syco23.sqlite"',
        "cache-control": "no-store",
        "x-request-id": requestId,
      });
      response.end(bytes);
      return;
    }
    return json(
      response,
      404,
      {
        ok: false,
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route not found",
          requestId,
        },
      },
      requestId,
    );
  } catch (error) {
    const apiError = asApiError(error);
    return json(
      response,
      apiError.status,
      {
        ok: false,
        error: {
          code: apiError.code,
          message: apiError.message,
          detail: apiError.detail,
          requestId,
        },
      },
      requestId,
    );
  }
}

async function main(): Promise<void> {
  await service.initialize();
  await metadata.initialize();
  events.subscribe((event) => {
    if (event.type === "destination.worker.cooldown") {
      const payload = event.payload as {
        destinationId?: string;
        label?: string;
        reason?: string;
        restartCount?: number;
      };
      void operations.openIncident(
        "critical",
        `Destination ${payload.label || payload.destinationId || "unknown"} entered cooldown`,
        `${payload.reason || "Worker recovery exhausted"} after ${payload.restartCount || 0} restart attempts.`,
        `destination:${payload.destinationId || "unknown"}`,
      );
    }
  });
  scheduler.start();
  watchdog.start();
  metadata.start();
  const server = createServer(
    (request, response) => void route(request, response),
  );
  const sockets = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`,
    );
    if (url.pathname !== "/api/events/ws") return socket.destroy();
    const ticket = url.searchParams.get("ticket") || "";
    if (!wsTickets.consume(ticket)) return socket.destroy();
    sockets.handleUpgrade(request, socket, head, (client) =>
      sockets.emit("connection", client, request),
    );
  });
  sockets.on("connection", (client) => {
    client.send(
      JSON.stringify({
        type: "runtime.snapshot",
        timestamp: new Date().toISOString(),
        payload: service.status(),
      }),
    );
    const unsubscribe = events.subscribe((event) => {
      if (client.readyState === client.OPEN) client.send(JSON.stringify(event));
    });
    client.on("close", unsubscribe);
  });
  server.listen(port, host, () =>
    console.log(`SYCO23 control runtime listening on http://${host}:${port}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      scheduler.stop();
      watchdog.stop();
      metadata.stop();
      void service
        .stopPipeline()
        .finally(() => server.close(() => process.exit(0)));
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
