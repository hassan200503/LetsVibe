"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/chat/types";
import { IconPause, IconPlay, IconTrash, IconX } from "@/components/icons";
import { duration as fmt } from "./format";

/**
 * Photos and voice notes inside a bubble. The voice player is the only one
 * playing at a time (like a phone's messenger), the waveform is the recording's
 * own peaks, and every control is reachable by keyboard.
 */

// ─── Voice playback ───────────────────────────────────────────────────────

let pauseActive: (() => void) | null = null;

function stopOther() {
  pauseActive?.();
  pauseActive = null;
}

export function VoiceNote({ a }: { a: ChatAttachment }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [rate, setRate] = useState(1);
  const total = a.durationSec ?? 0;
  const bars = a.peaks.length >= 8 ? a.peaks : Array.from({ length: 36 }, () => 0.32);
  const unavailable = !a.url;

  const pause = useCallback(() => {
    audio.current?.pause();
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);

  useEffect(
    () => () => {
      if (pauseActive === pause) pauseActive = null;
    },
    [pause],
  );

  const toggle = () => {
    const el = audio.current;
    if (!el || unavailable) return;
    if (playing) return pause();
    stopOther();
    pauseActive = pause;
    el.playbackRate = rate;
    void el
      .play()
      .then(() => setPlaying(true))
      .catch(() => pause());
  };

  const seekTo = (fraction: number) => {
    const el = audio.current;
    if (!el) return;
    const length = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : total;
    if (length) el.currentTime = Math.max(0, Math.min(1, fraction)) * length;
    setT(el.currentTime);
  };

  const fraction = total ? Math.min(1, t / total) : 0;

  return (
    <div className="flex min-w-[13rem] max-w-[16rem] items-center gap-2 py-0.5" onPointerDown={(e) => e.stopPropagation()}>
      <audio
        ref={audio}
        src={a.url ?? undefined}
        preload="metadata"
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => {
          setPlaying(false);
          setT(0);
          if (pauseActive === pause) pauseActive = null;
        }}
        onError={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={unavailable}
        aria-label={unavailable ? "Voice note unavailable" : playing ? "Pause voice note" : "Play voice note"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-sm transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40"
      >
        {playing ? <IconPause size={16} /> : <IconPlay size={16} className="translate-x-[1px]" />}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Voice note progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(total))}
        aria-valuenow={Math.round(Math.min(t, total))}
        aria-valuetext={`${fmt(t) || "0:00"} of ${fmt(total) || "0:00"}`}
        onClick={(e) => {
          e.stopPropagation();
          const r = e.currentTarget.getBoundingClientRect();
          seekTo((e.clientX - r.left) / r.width);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const el = audio.current;
            if (el) {
              el.currentTime = Math.max(0, Math.min(total, el.currentTime + (e.key === "ArrowRight" ? 5 : -5)));
              setT(el.currentTime);
            }
          }
        }}
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {bars.map((p, i) => (
          <span
            key={i}
            aria-hidden
            className={`w-full rounded-full ${i / bars.length < fraction ? "bg-accent" : "bg-ink/25 dark:bg-white/30"}`}
            style={{ height: `${Math.max(3, Math.round(p * 26))}px` }}
          />
        ))}
      </div>
      <span className="w-9 shrink-0 text-right text-[0.68rem] tabular-nums text-muted" suppressHydrationWarning>
        {fmt(total)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1));
        }}
        disabled={unavailable || !total}
        aria-label={`Playback speed ${rate}×`}
        className="shrink-0 rounded-full px-1 text-[0.68rem] font-semibold text-muted transition hover:text-ink disabled:opacity-40"
      >
        {rate}×
      </button>
    </div>
  );
}

// ─── Photo ────────────────────────────────────────────────────────────────

export function PhotoNote({ a }: { a: ChatAttachment }) {
  const [open, setOpen] = useState(false);
  const thumb = a.thumbUrl ?? a.url;
  const ratio = a.width && a.height ? `${a.width} / ${a.height}` : undefined;

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);

  if (!thumb) {
    return (
      <span className="flex h-40 w-56 items-center justify-center rounded-[14px] bg-surface-2 text-xs text-muted" role="img" aria-label="Photo unavailable">
        Photo unavailable
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="block overflow-hidden rounded-[14px] bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        aria-label="Open photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed, couple-scoped URL from our own storage */}
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          className="max-h-[22rem] w-auto max-w-[17rem] bg-surface-2 object-cover"
          style={ratio ? { aspectRatio: ratio } : { minHeight: "9rem" }}
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed, couple-scoped URL from our own storage */}
          <img src={a.url ?? thumb} alt="" className="max-h-[92dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            aria-label="Close photo"
          >
            <IconX size={20} />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Recording ────────────────────────────────────────────────────────────

export type VoiceDraft = { blob: Blob; durationSec: number; peaks: number[]; previewUrl: string };

/** 48 bars from however many RMS samples were taken: average each bucket, scale to the loudest. */
export function downsamplePeaks(values: number[], count = 48): number[] {
  if (!values.length) return [];
  const out: number[] = [];
  const size = values.length / count;
  for (let i = 0; i < count; i += 1) {
    const from = Math.floor(i * size);
    const to = Math.max(from + 1, Math.floor((i + 1) * size));
    let sum = 0;
    for (let j = from; j < to && j < values.length; j += 1) sum += values[j];
    out.push(sum / (to - from));
  }
  const loudest = Math.max(...out, 0.0001);
  return out.map((v) => Math.max(0.06, Math.min(1, v / loudest)));
}

const pickMime = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
};

export function useVoiceRecorder(onReady: (draft: VoiceDraft) => void, maxMs: number) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);
  const allPeaks = useRef<number[]>([]);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);

  const teardown = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
    recorder.current = null;
    setRecording(false);
    setLive([]);
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    recorder.current?.stop();
    teardown();
    setSeconds(0);
  }, [teardown]);

  const stop = useCallback(() => {
    cancelled.current = false;
    recorder.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice notes need a browser with microphone support.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const mimeType = pickMime();
      const rec = new MediaRecorder(s, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
      recorder.current = rec;
      chunks.current = [];
      allPeaks.current = [];
      cancelled.current = false;
      started.current = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const wasCancelled = cancelled.current;
        const ms = Math.min(maxMs, Date.now() - started.current);
        teardown();
        setSeconds(0);
        if (wasCancelled) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (!blob.size) return setError("That recording was empty. Try again.");
        ready.current({ blob, durationSec: ms / 1000, peaks: downsamplePeaks(allPeaks.current), previewUrl: URL.createObjectURL(blob) });
      };
      rec.start(250);

      // Peaks and a timer: the analyser is only for the drawing, never stored.
      const ctx = new AudioContext();
      context.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      timer.current = setInterval(() => {
        const elapsed = Math.min(maxMs, Date.now() - started.current);
        setSeconds(elapsed / 1000);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) {
          const x = (v - 128) / 128;
          sum += x * x;
        }
        const rms = Math.sqrt(sum / data.length);
        allPeaks.current.push(Math.min(1, rms * 4));
        setLive((list) => [...list.slice(-31), Math.min(1, rms * 4)]);
        if (elapsed >= maxMs) rec.stop();
      }, 90);
      setRecording(true);
    } catch {
      teardown();
      setError("The microphone isn't available. Allow it in your browser, or send a photo instead.");
    }
  }, [maxMs, teardown]);

  useEffect(() => () => teardown(), [teardown]);

  return { recording, seconds, live, error, start, stop, cancel, clearError: () => setError(null) };
}

/** The bar shown while recording: time, live peaks, cancel and finish. */
export function RecordingBar({ seconds, live, onCancel, onStop }: { seconds: number; live: number[]; onCancel: () => void; onStop: () => void }) {
  return (
    <div className="flex items-center gap-3 px-1 py-1" role="status" aria-label="Recording a voice note">
      <button type="button" onClick={onCancel} className="grid size-10 place-items-center rounded-full text-danger transition hover:bg-danger-soft" aria-label="Cancel recording">
        <IconTrash size={18} />
      </button>
      <span className="w-10 text-sm font-semibold tabular-nums text-danger" aria-hidden>
        {fmt(seconds) || "0:00"}
      </span>
      <div className="flex h-8 min-w-0 flex-1 items-center gap-[2px]" aria-hidden>
        {(live.length ? live : Array.from({ length: 32 }, () => 0.12)).map((p, i) => (
          <span key={i} className="w-full rounded-full bg-danger/60" style={{ height: `${Math.max(3, Math.round(p * 28))}px` }} />
        ))}
      </div>
      <button
        type="button"
        onClick={onStop}
        className="grid size-10 place-items-center rounded-full bg-accent text-accent-ink shadow-md transition hover:brightness-110 active:scale-95"
        aria-label="Finish recording"
      >
        <span className="size-3 rounded-[3px] bg-current" aria-hidden />
      </button>
    </div>
  );
}
