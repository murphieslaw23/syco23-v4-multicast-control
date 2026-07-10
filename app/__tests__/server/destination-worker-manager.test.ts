import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { DestinationWorkerManager } from "../../server/ffmpeg/destination-worker-manager";
import { RuntimeEventBus } from "../../server/runtime/event-bus";
import type { DestinationState, OutputProfile } from "../../types";

let directory = "";
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

const profile: OutputProfile = {
  id: "p",
  name: "p",
  provider: "custom-rtmp",
  width: 640,
  height: 360,
  videoBitrate: 500,
  audioBitrate: 64,
  fps: 25,
  codec: "libx264",
};
function destination(id: string, key: string): DestinationState {
  return {
    id,
    provider: "custom-rtmp",
    label: id,
    protocol: "rtmp",
    endpointUrl: "rtmp://example/live",
    streamKeyRef: key,
    status: "armed",
    health: null,
    lastHandshakeAt: null,
    lastError: null,
    videoProfile: "p",
    audioProfile: "aac",
    monitorMode: "rtmp-output",
    requiresManualPlatformSetup: false,
    capabilities: [],
    transmissionKitId: null,
    notes: "",
  };
}

describe("DestinationWorkerManager", () => {
  it("isolates a failing destination while a healthy worker stays running", async () => {
    directory = await mkdtemp(join(tmpdir(), "syco-workers-"));
    const executable = join(directory, "fake-ffmpeg.sh");
    await writeFile(
      executable,
      `#!/bin/sh\ncase \"$*\" in *fail-key*) exit 2;; esac\necho frame=1\necho fps=25\necho bitrate=500.0kbits/s\necho progress=continue\nsleep 5\n`,
    );
    await chmod(executable, 0o755);
    const events = new RuntimeEventBus();
    const manager = new DestinationWorkerManager(events, {
      maxRestarts: 0,
      baseBackoffMs: 5,
      cooldownMs: 1000,
    });
    await manager.start({
      inputUrl: "https://example.test/input",
      destinations: [
        destination("healthy", "GOOD"),
        destination("failing", "BAD"),
      ],
      profiles: [profile],
      streamKeys: { GOOD: "good-key", BAD: "fail-key" },
      ffmpegPath: executable,
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    const snapshots = manager.snapshots();
    expect(
      snapshots.find((item) => item.destinationId === "healthy")?.state,
    ).toBe("running");
    expect(
      snapshots.find((item) => item.destinationId === "failing")?.state,
    ).toBe("cooldown");
    expect(manager.aggregateSnapshot().health).toBe("degraded");
    await manager.stop();
  });

  it("reports independent metrics for each worker", async () => {
    directory = await mkdtemp(join(tmpdir(), "syco-workers-"));
    const executable = join(directory, "fake-ffmpeg.sh");
    await writeFile(
      executable,
      "#!/bin/sh\necho frame=5\necho fps=25\necho bitrate=500.0kbits/s\necho progress=continue\nsleep 5\n",
    );
    await chmod(executable, 0o755);
    const manager = new DestinationWorkerManager(new RuntimeEventBus());
    await manager.start({
      inputUrl: "https://example.test/input",
      destinations: [destination("one", "ONE"), destination("two", "TWO")],
      profiles: [profile],
      streamKeys: { ONE: "one", TWO: "two" },
      ffmpegPath: executable,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(manager.snapshots().every((item) => item.metrics.fps === 25)).toBe(
      true,
    );
    expect(manager.aggregateSnapshot().metrics.bitrateKbps).toBe(1000);
    await manager.stop();
  });
});
