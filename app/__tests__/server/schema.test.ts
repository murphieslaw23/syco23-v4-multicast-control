import { describe, it, expect } from "vitest";
import { SCHEMA_SQL, validateSchema } from "../../server/schema";

describe("server/schema", () => {
  it("all required tables are present", () => {
    const result = validateSchema(SCHEMA_SQL);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.tables).toHaveLength(14);
  });

  it("includes streams table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS streams");
  });

  it("includes destinations table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS destinations");
  });

  it("includes output_profiles table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS output_profiles");
  });

  it("includes templates table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS templates");
  });

  it("includes transmission_kits table", () => {
    expect(SCHEMA_SQL).toContain(
      "CREATE TABLE IF NOT EXISTS transmission_kits",
    );
  });

  it("includes log_entries table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS log_entries");
  });

  it("includes watchdog_events table", () => {
    expect(SCHEMA_SQL).toContain("CREATE TABLE IF NOT EXISTS watchdog_events");
  });

  it("detects missing tables", () => {
    const incomplete =
      "CREATE TABLE IF NOT EXISTS streams (id TEXT PRIMARY KEY)";
    const result = validateSchema(incomplete);
    expect(result.valid).toBe(false);
    expect(result.tables).toHaveLength(1);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});

describe("server/metadata middleware", () => {
  it("normalizeAzuraCast extracts title and artist", async () => {
    const { normalizeAzuraCast } = await import("../../server/metadata");
    const raw = {
      id: "s1",
      name: "SYCO23 Radio",
      shortcode: "syc",
      description: "",
      url: "https://syco23.de",
      genre: "Techno",
      listeners: { total: 100, unique: 50, current: 30 },
      is_playing: true,
      now_playing: {
        song: {
          id: "song1",
          text: "Artist — Title",
          artist: "Artist",
          title: "Track Name",
          album: "Album",
          art: "https://example.com/art.jpg",
        },
        elapsed: 30,
        duration: 300,
      },
      history: [],
    };

    const result = normalizeAzuraCast(raw);
    expect(result.title).toBe("Track Name");
    expect(result.artist).toBe("Artist");
    expect(result.show).toBe("SYCO23 Radio");
    expect(result.listeners).toBe(30);
  });

  it("normalizeAzuraCast handles missing data", async () => {
    const { normalizeAzuraCast } = await import("../../server/metadata");
    const raw = {
      id: "s1",
      name: "",
      shortcode: "",
      description: "",
      url: "",
      genre: "",
      listeners: { total: 0, unique: 0, current: 0 },
      is_playing: false,
      now_playing: {
        song: { id: "", text: "", artist: "", title: "", album: "", art: "" },
        elapsed: 0,
        duration: 0,
      },
      history: [],
    };

    const result = normalizeAzuraCast(raw);
    expect(result.title).toBe("");
    expect(result.artist).toBe("");
    expect(result.listeners).toBe(0);
  });

  it("createMetadataMiddleware returns initial empty state", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");
    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "test-key",
      pollIntervalMs: 60000,
    });
    const latest = mw.getLatest();
    expect(latest.title).toBe("");
    expect(latest.artist).toBe("");
    expect(latest.listeners).toBeNull();
  });

  it("createMetadataMiddleware start/stop do not throw", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");
    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "key",
      pollIntervalMs: 60000,
    });
    expect(() => mw.start()).not.toThrow();
    expect(() => mw.stop()).not.toThrow();
    mw.stop();
  });

  it("poll handles non-OK response gracefully", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as any;

    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "key",
      pollIntervalMs: 60000,
    });
    const result = await mw.poll();
    expect(result.title).toBe("");
    globalThis.fetch = origFetch;
  });

  it("poll handles network error gracefully", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network fail")) as any;

    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "key",
      pollIntervalMs: 60000,
    });
    const result = await mw.poll();
    expect(result.title).toBe("");
    globalThis.fetch = origFetch;
  });

  it("poll updates latest on successful response", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");

    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          id: "s1",
          name: "Station",
          now_playing: { song: { title: "Hit Song", artist: "DJ", art: "" } },
          listeners: { current: 42 },
        }),
    };
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse) as any;

    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "key",
      pollIntervalMs: 60000,
    });
    const result = await mw.poll();
    expect(result.title).toBe("Hit Song");
    expect(result.artist).toBe("DJ");
    expect(mw.getLatest().title).toBe("Hit Song");
    globalThis.fetch = origFetch;
  });

  it("normalizeAzuraCast uses fallback for missing song fields", async () => {
    const { normalizeAzuraCast } = await import("../../server/metadata");
    const raw = {
      id: "s1",
      name: null,
      shortcode: "",
      description: "",
      url: "",
      genre: "",
      listeners: { total: 0, unique: 0, current: 0 },
      is_playing: false,
      now_playing: {
        song: {
          id: "",
          text: "",
          artist: null,
          title: null,
          album: "",
          art: null,
        },
        elapsed: 0,
        duration: 0,
      },
      history: [],
    };

    const result = normalizeAzuraCast(raw);
    expect(result.title).toBe("");
    expect(result.artist).toBe("");
    expect(result.show).toBeNull();
    expect(result.artworkUrl).toBeNull();
  });

  it("normalizeAzuraCast handles missing listeners", async () => {
    const { normalizeAzuraCast } = await import("../../server/metadata");
    const raw = {
      id: "s1",
      name: "Station",
      shortcode: "",
      description: "",
      url: "",
      genre: "",
      listeners: null,
      is_playing: false,
      now_playing: {
        song: { id: "", text: "", artist: "", title: "", album: "", art: "" },
        elapsed: 0,
        duration: 0,
      },
      history: [],
    };

    const result = normalizeAzuraCast(raw);
    expect(result.listeners).toBeNull();
  });

  it("start is idempotent when called twice", async () => {
    const { createMetadataMiddleware } = await import("../../server/metadata");
    const mw = createMetadataMiddleware({
      apiUrl: "https://example.com",
      apiKey: "key",
      pollIntervalMs: 60000,
    });
    mw.start();
    mw.start();
    mw.stop();
  });
});

describe("server/api-routes", () => {
  it("handler returns the runtime metadata snapshot", async () => {
    const { createApiRouteHandler } = await import("../../server/api-routes");
    const handler = createApiRouteHandler();
    const res = await handler("GET /api/metadata");
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.error).toBeNull();
    expect(res.data).toMatchObject({ artist: "SYCO23" });
  });
});

describe("server/watchdog-store", () => {
  it("records events and tracks health", async () => {
    const { createWatchdogStore } = await import("../../server/watchdog-store");
    const store = createWatchdogStore();

    store.record({ source: "ffmpeg", message: "test", severity: "info" });
    expect(store.store.events).toHaveLength(1);
    expect(store.store.healthy).toBe(true);
  });

  it("marks unhealthy on error", async () => {
    const { createWatchdogStore } = await import("../../server/watchdog-store");
    const store = createWatchdogStore();

    store.record({ source: "ffmpeg", message: "stalled", severity: "error" });
    expect(store.store.healthy).toBe(false);
  });

  it("getEvents respects limit", async () => {
    const { createWatchdogStore } = await import("../../server/watchdog-store");
    const store = createWatchdogStore();

    for (let i = 0; i < 10; i++) {
      store.record({ source: "test", message: `event ${i}`, severity: "info" });
    }
    const events = store.getEvents(5);
    expect(events).toHaveLength(5);
  });

  it("setHealthy overrides health", async () => {
    const { createWatchdogStore } = await import("../../server/watchdog-store");
    const store = createWatchdogStore();

    store.record({ source: "test", message: "err", severity: "error" });
    expect(store.store.healthy).toBe(false);
    store.setHealthy(true);
    expect(store.store.healthy).toBe(true);
  });

  it("clear removes all events", async () => {
    const { createWatchdogStore } = await import("../../server/watchdog-store");
    const store = createWatchdogStore();

    store.record({ source: "test", message: "msg", severity: "info" });
    store.clear();
    expect(store.store.events).toHaveLength(0);
    expect(store.store.healthy).toBe(true);
  });
});
