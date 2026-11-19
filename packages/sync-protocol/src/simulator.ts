import { addSample, estimateClock, serverNow, type ClockSample } from "./clock";
import { planCorrection } from "./correction";
import { expectedPositionMs } from "./state";
import { IDLE_SNAPSHOT, type PlaybackSnapshot } from "./types";

/**
 * A deterministic room simulator, for CI rather than for production.
 *
 * Two virtual clients with skewed clocks, a server that owns the state, and a
 * network with latency, jitter and loss are advanced in virtual time. Clients
 * poll, send commands, estimate the server clock from their fastest round
 * trips, and correct their playhead exactly as the app does. Nothing here uses
 * `Date.now()` or `Math.random()`: two runs of the same seed produce the same
 * numbers, so a drift regression fails the build instead of flaking.
 *
 * This is how the "p95 drift under 500 ms" target is measured before any real
 * device is in the room.
 */

export type NetworkProfile = {
  /** One-way delay. */
  latencyMs: number;
  /** Uniform one-way delay above and below the latency. */
  jitterMs: number;
  /** Probability a message is dropped, 0..1. */
  loss: number;
};

export type CommandKind = "source" | "play" | "pause" | "seek";

export type Command = {
  atMs: number;
  from: Side;
  kind: CommandKind;
  positionMs?: number;
  sourceKey?: string;
};

export type Stall = {
  client: Side;
  atMs: number;
  durationMs: number;
};

export type SimScenario = {
  durationMs?: number;
  /** Ignored while the room settles after a seek. */
  settleMs?: number;
  /** Commands after the bootstrap; the first `source` is optional. */
  commands?: Command[];
  /** Simulated buffering: the player's clock freezes for a while. */
  stalls?: Stall[];
  sourceKey?: string;
  seed?: number;
  /** Optional per-tick trace, for diagnosing a failing scenario. */
  trace?: (row: { t: number; client: Side; posMs: number; wantMs: number; driftMs: number; kind: string }) => void;
};

export type SimResult = {
  /** Median absolute drift during steady playback. */
  p50Ms: number;
  /** 95th percentile absolute drift during steady playback. */
  p95Ms: number;
  /** Worst steady-state drift. */
  maxMs: number;
  /** Worst drift including the settle window; reported, not asserted. */
  worstMs: number;
  samples: number;
  seeks: number;
  nudges: number;
  polls: number;
  missedBroadcasts: number;
  /** Snapshots each client applied (delivered broadcasts plus poll replies). */
  appliedA: number;
  appliedB: number;
};

type Side = "a" | "b";

type Client = {
  id: Side;
  skewMs: number;
  samples: ClockSample[];
  offsetMs: number;
  snapshot: PlaybackSnapshot;
  playing: boolean;
  posMs: number;
  anchorLocalMs: number;
  rate: number;
  nextTickAt: number;
  nextPollAt: number;
  pending?: { command: Command; id: number; baseSeq: number; lastSentAt: number };
  nextControlId: number;
  seeks: number;
  nudges: number;
  polls: number;
  applied: number;
  drifts: number[];
  worstMs: number;
  lastSeekAt: number;
  /** Fractional device/media-clock error; real players are rarely exactly 1.0. */
  rateBias: number;
  /** Local clock at which a simulated buffer stall ends. */
  stallUntilLocal: number;
  /** Virtual time at which the last stall ended. */
  lastStallEndAt: number;
};

type Msg =
  | { at: number; to: "server"; from: Side; kind: "ping"; id: number; sentLocalMs: number }
  | { at: number; to: "server"; from: Side; kind: "poll"; sentLocalMs: number }
  | { at: number; to: "server"; from: Side; kind: "control"; id: number; command: Command }
  | { at: number; to: Side; kind: "pong"; id: number; sentLocalMs: number; serverTimeMs: number }
  | { at: number; to: Side; kind: "snapshot"; snapshot: PlaybackSnapshot; broadcast: boolean; serverTimeMs: number; sentLocalMs?: number };

const BASE = 1_700_000_000_000;
const TICK_MS = 500;
const POLL_MS = 1_000;
const PING_INTERVAL_MS = 250;
const PINGS = 6;

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function makeClient(id: Side, skewMs: number, rateBias: number): Client {
  return {
    id,
    skewMs,
    samples: [],
    offsetMs: 0,
    snapshot: { ...IDLE_SNAPSHOT },
    playing: false,
    posMs: 0,
    anchorLocalMs: 0,
    rate: 1,
    nextTickAt: 0,
    nextPollAt: 0,
    nextControlId: 1,
    seeks: 0,
    nudges: 0,
    polls: 0,
    applied: 0,
    drifts: [],
    worstMs: 0,
    lastSeekAt: -1,
    rateBias,
    stallUntilLocal: -1,
    lastStallEndAt: -1,
  };
}

const localNow = (client: Client, t: number): number => t + client.skewMs;

function positionOf(client: Client, localMs: number): number {
  if (!client.playing) return client.posMs;
  return client.posMs + (localMs - client.anchorLocalMs) * client.rate * (1 + client.rateBias);
}

function anchor(client: Client, positionMs: number, localMs: number, rate: number): void {
  client.posMs = Math.max(0, positionMs);
  client.anchorLocalMs = localMs;
  client.rate = rate;
}

function applySnapshot(client: Client, snapshot: PlaybackSnapshot): boolean {
  if (snapshot.seq <= client.snapshot.seq) return false;
  client.snapshot = snapshot;
  client.applied += 1;
  return true;
}

export const NETWORK_PROFILES = {
  wifi: { latencyMs: 35, jitterMs: 8, loss: 0 },
  mobile: { latencyMs: 90, jitterMs: 40, loss: 0.05 },
  poor: { latencyMs: 220, jitterMs: 120, loss: 0.15 },
} satisfies Record<string, NetworkProfile>;

export function simulateRoom(network: NetworkProfile, scenario: SimScenario = {}): SimResult {
  const duration = scenario.durationMs ?? 95_000;
  const settle = scenario.settleMs ?? 2_000;
  const seed = scenario.seed ?? 7;
  const random = rng(seed);
  const sourceKey = scenario.sourceKey ?? "youtube:fixture";
  const stalls: Stall[] = scenario.stalls ?? [
    { client: "b", atMs: 20_000, durationMs: 650 },
    { client: "a", atMs: 50_000, durationMs: 2_500 },
  ];
  const commands: Command[] = scenario.commands ?? [
    { atMs: 3_000, from: "a", kind: "source", sourceKey },
    { atMs: 5_000, from: "a", kind: "play", positionMs: 0 },
    { atMs: 35_000, from: "a", kind: "seek", positionMs: 60_000 },
    { atMs: 65_000, from: "a", kind: "pause" },
    { atMs: 72_000, from: "a", kind: "play" },
  ];

  let messages: Msg[] = [];
  // Skewed clocks and slightly imperfect media clocks on both sides.
  const clients: Record<Side, Client> = { a: makeClient("a", 37_000, 0.0012), b: makeClient("b", -12_000, -0.0009) };
  const server: { snapshot: PlaybackSnapshot } = { snapshot: { ...IDLE_SNAPSHOT } };
  const seenControls = new Set<number>();

  let missedBroadcasts = 0;

  let timers: { at: number; run: () => void }[] = [];
  const after = (when: number, run: () => void): void => {
    timers.push({ at: when, run });
  };

  const schedule = (atMs: number, build: (at: number) => Msg): void => {
    if (random() < network.loss) return;
    const jitter = (random() * 2 - 1) * network.jitterMs;
    messages.push(build(Math.max(0, Math.round(atMs + network.latencyMs + jitter))));
  };

  const sendPing = (client: Client, t: number): void => {
    const id = client.nextControlId++;
    const sentLocalMs = localNow(client, t);
    schedule(t, (at) => ({ at, to: "server", from: client.id, kind: "ping", id, sentLocalMs }));
  };

  const sendPoll = (client: Client, t: number): void => {
    client.polls += 1;
    const sentLocalMs = localNow(client, t);
    schedule(t, (at) => ({ at, to: "server", from: client.id, kind: "poll", sentLocalMs }));
  };

  const sendControl = (client: Client, command: Command, t: number): void => {
    client.pending = { command, id: client.nextControlId++, baseSeq: server.snapshot.seq, lastSentAt: t };
    schedule(t, (at) => ({ at, to: "server", from: client.id, kind: "control", id: client.pending!.id, command }));
  };

  const broadcast = (t: number): void => {
    for (const client of [clients.a, clients.b]) {
      const before = messages.length;
      schedule(t, (at) => ({ at, to: client.id, kind: "snapshot", snapshot: server.snapshot, broadcast: true, serverTimeMs: t }));
      if (messages.length === before) missedBroadcasts += 1;
    }
  };

  const write = (command: Command, t: number): void => {
    const now = t;
    const current = server.snapshot;
    const at = expectedPositionMs(current, now);
    let next: PlaybackSnapshot;
    switch (command.kind) {
      case "source":
        next = { ...current, playing: false, positionMs: 0, sourceKey: command.sourceKey ?? current.sourceKey, serverTimeMs: now };
        break;
      case "play":
        next = { ...current, playing: true, positionMs: Math.max(0, command.positionMs ?? at), serverTimeMs: now };
        break;
      case "pause":
        next = { ...current, playing: false, positionMs: Math.max(0, command.positionMs ?? at), serverTimeMs: now };
        break;
      case "seek":
        next = { ...current, positionMs: Math.max(0, command.positionMs ?? at), serverTimeMs: now };
        break;
    }
    server.snapshot = { ...next, seq: current.seq + 1, authorId: command.from, rate: 1 };
    broadcast(now);
  };

  const tick = (client: Client, t: number): void => {
    const snapshot = client.snapshot;
    if (snapshot.sourceKey === null || snapshot.seq === 0) {
      client.nextTickAt = t + TICK_MS;
      return;
    }
    const local = localNow(client, t);
    // Buffering: the player is frozen and jumping now would only restart the wait.
    if (local < client.stallUntilLocal) {
      client.anchorLocalMs = local;
      client.nextTickAt = t + TICK_MS;
      return;
    }
    if (client.stallUntilLocal > 0) {
      // Playback resumes at the stall's end, not at this tick.
      client.anchorLocalMs = client.stallUntilLocal;
      client.stallUntilLocal = -1;
    }
    const want = expectedPositionMs(snapshot, serverNow(local, client.offsetMs));
    const pos = positionOf(client, local);

    if (snapshot.playing) {
      if (!client.playing) {
        client.playing = true;
        anchor(client, want, local, 1);
        client.lastSeekAt = t;
      } else {
        const drift = pos - want;
        const plan = planCorrection(drift, { canRate: true });
        scenario.trace?.({ t, client: client.id, posMs: pos, wantMs: want, driftMs: drift, kind: plan.kind });
        if (plan.kind === "seek") {
          anchor(client, want, local, 1);
          client.seeks += 1;
          client.lastSeekAt = t;
        } else if (plan.kind === "nudge") {
          anchor(client, pos, local, plan.rate);
          client.nudges += 1;
        } else {
          anchor(client, pos, local, 1);
        }
        // A seek needs a moment to resume; a sample taken across it says more
        // about the stall than about steady-state sync.
        if (t >= 8_000 && t - client.lastSeekAt >= settle && t - client.lastStallEndAt >= settle) {
          const steady = Math.abs(drift);
          client.drifts.push(steady);
          client.worstMs = Math.max(client.worstMs, steady);
        } else if (t >= 8_000) {
          client.worstMs = Math.max(client.worstMs, Math.abs(drift));
        }
      }
    } else {
      if (client.playing) {
        client.playing = false;
        anchor(client, pos, local, 1);
      }
      if (Math.abs(pos - want) > 350) {
        anchor(client, want, local, 1);
        client.seeks += 1;
        client.lastSeekAt = t;
      }
    }
    client.nextTickAt = t + TICK_MS;
  };

  // Bootstrap pings so both clients know the server clock before playback.
  for (const client of [clients.a, clients.b]) {
    for (let i = 0; i < PINGS; i += 1) {
      const when = 100 + i * PING_INTERVAL_MS;
      after(when, () => sendPing(client, when));
    }
  }
  for (const command of commands) after(command.atMs, () => sendControl(clients[command.from], command, command.atMs));
  for (const stall of stalls) {
    after(stall.atMs, () => {
      const client = clients[stall.client];
      const local = localNow(client, stall.atMs);
      anchor(client, positionOf(client, local), local, client.rate);
      client.stallUntilLocal = local + stall.durationMs;
      client.lastStallEndAt = stall.atMs + stall.durationMs;
    });
  }

  for (let t = 0; t <= duration; t += 25) {
    const dueTimers = timers.filter((timer) => timer.at <= t);
    timers = timers.filter((timer) => timer.at > t);
    for (const timer of dueTimers) timer.run();

    messages.sort((x, y) => x.at - y.at);
    const due = messages.filter((m) => m.at <= t);
    messages = messages.filter((m) => m.at > t);

    for (const message of due) {
      if (message.to === "server") {
        if (message.kind === "ping") {
          schedule(t, (at) => ({ at, to: message.from, kind: "pong", id: message.id, sentLocalMs: message.sentLocalMs, serverTimeMs: t }));
        } else if (message.kind === "poll") {
          schedule(t, (at) => ({ at, to: message.from, kind: "snapshot", snapshot: server.snapshot, broadcast: false, serverTimeMs: t, sentLocalMs: message.sentLocalMs }));
        } else {
          if (seenControls.has(message.id)) continue;
          seenControls.add(message.id);
          write(message.command, t);
        }
      } else {
        const client = clients[message.to];
        if (message.kind === "pong") {
          client.samples = addSample(client.samples, { sentClientMs: message.sentLocalMs, receivedClientMs: localNow(client, t), serverTimeMs: message.serverTimeMs });
          client.offsetMs = estimateClock(client.samples).offsetMs;
        } else {
          // Poll replies double as clock samples, exactly like the room's
          // serverNow on every response.
          if (message.sentLocalMs !== undefined) {
            client.samples = addSample(client.samples, { sentClientMs: message.sentLocalMs, receivedClientMs: localNow(client, t), serverTimeMs: message.serverTimeMs });
            client.offsetMs = estimateClock(client.samples).offsetMs;
          }
          applySnapshot(client, message.snapshot);
          if (client.pending && message.snapshot.seq > client.pending.baseSeq) client.pending = undefined;
        }
      }
    }

    for (const client of [clients.a, clients.b]) {
      if (client.pending && t - client.pending.lastSentAt >= 1_000) {
        const { command, id } = client.pending;
        client.pending.lastSentAt = t;
        schedule(t, (at) => ({ at, to: "server", from: client.id, kind: "control", id, command }));
      }
      if (t >= 1_500 && t >= client.nextPollAt) {
        sendPoll(client, t);
        client.nextPollAt = t + POLL_MS;
      }
      if (t >= 1_500 && t >= client.nextTickAt) tick(client, t);
    }
  }

  const drifts = [...clients.b.drifts, ...clients.a.drifts].sort((x, y) => x - y);
  return {
    p50Ms: Math.round(percentile(drifts, 50)),
    p95Ms: Math.round(percentile(drifts, 95)),
    maxMs: Math.round(drifts.at(-1) ?? 0),
    worstMs: Math.round(Math.max(clients.a.worstMs, clients.b.worstMs)),
    samples: drifts.length,
    seeks: clients.a.seeks + clients.b.seeks,
    nudges: clients.a.nudges + clients.b.nudges,
    polls: clients.a.polls + clients.b.polls,
    missedBroadcasts,
    appliedA: clients.a.applied,
    appliedB: clients.b.applied,
  };
}
