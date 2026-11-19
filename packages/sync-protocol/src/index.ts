export { IDLE_SNAPSHOT, toSeconds, type PlaybackSnapshot, type SyncEvent, type SyncEventType } from "./types";
export { applyEvent, expectedPositionMs, hasEnded, isStale } from "./state";
export { NO_CLOCK, addSample, clockOffset, clockRtt, estimateClock, serverNow, type ClockEstimate, type ClockSample } from "./clock";
export {
  DEFAULT_CORRECTION,
  MIN_HEARTBEAT_MS,
  heartbeatDue,
  planCorrection,
  type Correction,
  type CorrectionConfig,
  type CorrectionOptions,
} from "./correction";
export {
  NETWORK_PROFILES,
  simulateRoom,
  type Command,
  type CommandKind,
  type NetworkProfile,
  type SimResult,
  type SimScenario,
} from "./simulator";
