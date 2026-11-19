/** Shapes shared by the chat API and the chat UI (safe to import on the client). */
import type { CallView } from "@/lib/calls/types";

export type ChatQuote = { id: number; slug: string; kind: string; body: string; deleted: boolean };

/** A photo or voice note attached to one message, read through a signed URL. */
export type ChatAttachment = {
  id: string;
  kind: "image" | "voice";
  url: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  /** Normalised recording peaks (0..1) for the voice-note waveform. */
  peaks: number[];
};

export type ChatMessage = {
  id: number;
  clientId: string | null;
  /** Sender. */
  slug: string;
  kind: "text" | "call" | "media";
  body: string;
  attachment: ChatAttachment | null;
  replyTo: ChatQuote | null;
  call: { callKind: "audio" | "video"; outcome: string; durationSec: number | null } | null;
  /** slug → emoji */
  reactions: Record<string, string>;
  deleted: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatPartner = {
  slug: string;
  online: boolean;
  lastSeenAt: string | null;
  typing: boolean;
  /** Highest of my messages they've opened / received. */
  readUpTo: number;
  deliveredUpTo: number;
};

export type ChatSync = {
  serverNow: string;
  messages: ChatMessage[];
  /** Messages I deleted for myself since the last sync. */
  removed: number[];
  partner: ChatPartner | null;
  /** How far I had read when this sync started (for the unread divider). */
  myReadUpTo: number;
  hasMore?: boolean;
  /** A call ringing or connected right now, so an open chat rings without waiting for the site-wide pulse. */
  call?: CallView | null;
};

/** Edits are allowed for a short while after sending, like other messengers. */
export const EDIT_WINDOW_MS = 15 * 60_000;
export const MAX_MESSAGE = 4000;
/** A voice note is a message, not a podcast: five minutes is plenty. */
export const MAX_VOICE_MS = 5 * 60_000;
export const MAX_PEAKS = 48;
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "🥹", "🙏", "👍"] as const;
