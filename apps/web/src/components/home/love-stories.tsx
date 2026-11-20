"use client";

import { useEffect, useState } from "react";
import { IconArrowUpRight, IconChevronLeft, IconChevronRight, IconPause, IconPlay } from "@/components/icons";

/**
 * A small cinema on the home stage: the most-told love stories, each as a
 * five-scene trailer — names at the start, three subtitle beats over real
 * footage from the film's official trailer, names again at the end — rolling
 * into the next story on its own.
 */
type Story = {
  a: string;
  b: string;
  film: string;
  source: string;
  /** YouTube id of the official trailer. */
  video: string;
  /** Two duotone hues for this story's light, shown while the video loads. */
  c: [string, string];
  lines: [string, string, string];
};

const STORIES: Story[] = [
  {
    a: "Romeo",
    b: "Juliet",
    film: "Romeo + Juliet",
    source: "Romeo + Juliet · 1996",
    video: "8VOAxzgq42A",
    c: ["#f5b46b", "#ef7fa6"],
    lines: [
      "Two feuding houses. Two children who meet at a dance.",
      "They marry in secret and swear the night is enough.",
      "Their names outlive the quarrel that ended them.",
    ],
  },
  {
    a: "Elizabeth",
    b: "Darcy",
    film: "Pride & Prejudice",
    source: "Pride & Prejudice · 2005",
    video: "Ur_DIHs92NM",
    c: ["#b9d39a", "#e9c877"],
    lines: [
      "He calls her tolerable. She decides to dislike him.",
      "Letters, long walks, and a pride that will not bend.",
      "Two sharp minds arrive at the same quiet word.",
    ],
  },
  {
    a: "Jack",
    b: "Rose",
    film: "Titanic",
    source: "Titanic · 1997",
    video: "I7c1etV7D7g",
    c: ["#8fbde0", "#f0a98f"],
    lines: [
      "A first-class boy and a free girl on the ship of the century.",
      "The sea takes everything except the promise she keeps.",
      "A lifetime later, she still tells their story.",
    ],
  },
  {
    a: "Noah",
    b: "Allie",
    film: "The Notebook",
    source: "The Notebook · 2004",
    video: "BjJcYdEOI0k",
    c: ["#f0a19a", "#f3d08c"],
    lines: [
      "A summer town, a Ferris wheel, and a dare to ask her out.",
      "War, letters that never arrive, seven years apart.",
      "He reads their story aloud until she remembers it.",
    ],
  },
  {
    a: "Jay",
    b: "Daisy",
    film: "The Great Gatsby",
    source: "The Great Gatsby · 2013",
    video: "4w8lohkQtbY",
    c: ["#e3c47c", "#8fb0d8"],
    lines: [
      "A poor soldier falls for the golden girl across the bay.",
      "He builds a palace of parties to win her back.",
      "The light at the end of the dock never stops calling.",
    ],
  },
  {
    a: "Maria",
    b: "Tony",
    film: "West Side Story",
    source: "West Side Story · 2021",
    video: "A5GJLwWiYSg",
    c: ["#e8b578", "#9fc4d8"],
    lines: [
      "Two gangs, one city, and a love that refuses sides.",
      "A rumble, a shot, and a promise made too late.",
      "Somewhere, a place for them still waits.",
    ],
  },
  {
    a: "Mia",
    b: "Sebastian",
    film: "La La Land",
    source: "La La Land · 2016",
    video: "0pdqf4P9MB8",
    c: ["#b7a5e0", "#f0cf86"],
    lines: [
      "A pianist and an actress meet between auditions.",
      "Ambition asks them both to choose a road.",
      "They find the ending they dreamed of — apart.",
    ],
  },
  {
    a: "Hazel",
    b: "Augustus",
    film: "The Fault in Our Stars",
    source: "The Fault in Our Stars · 2014",
    video: "9ItBvH5J6ss",
    c: ["#9fb8d8", "#f2c98f"],
    lines: [
      "Two teenagers meet where the days feel borrowed.",
      "A book, a trip to Amsterdam, and an infinity in days.",
      "They choose each other for whatever time is left.",
    ],
  },
];

/** Title, three subtitle beats, end card. */
const PHASE_MS = [1300, 2100, 2100, 2100, 1400];
const TOTAL_MS = PHASE_MS.reduce((sum, ms) => sum + ms, 0);
const pad = (n: number) => String(n).padStart(2, "0");

function useHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return hidden;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const ICON_BTN =
  "icon-btn text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70";

export function LoveStoriesTrailer() {
  const [story, setStory] = useState(0);
  const [phase, setPhase] = useState(0);
  const [paused, setPaused] = useState(false);
  const hidden = useHidden();
  const reduced = useReducedMotion();
  const s = STORIES[story];
  const playing = !paused && !hidden;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => {
      if (phase < PHASE_MS.length - 1) {
        setPhase((p) => p + 1);
      } else {
        setPhase(0);
        setStory((n) => (n + 1) % STORIES.length);
      }
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(id);
  }, [playing, phase, story]);

  const show = (i: number) => {
    setStory(i);
    setPhase(0);
  };
  const step = (d: number) => show((story + d + STORIES.length) % STORIES.length);
  const onCard = phase === 0 || phase === PHASE_MS.length - 1;
  const caption =
    phase > 0 && phase < PHASE_MS.length - 1
      ? s.lines[phase - 1]
      : phase === 0
        ? "Their story, in five small scenes."
        : "The end — and the beginning.";

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="The great love stories"
      className="relative isolate overflow-hidden rounded-[26px] border border-white/12 bg-[#0b0a0e] shadow-[0_36px_90px_-46px_rgba(0,0,0,0.95)]"
    >
      {/* Colour light, visible while the trailer loads or when paused. */}
      <div
        key={`bg-${story}`}
        aria-hidden
        className="ls-bg absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 12% 6%, ${s.c[0]}59, transparent 58%), radial-gradient(115% 90% at 90% 96%, ${s.c[1]}4d, transparent 62%), linear-gradient(168deg, #191420 0%, #0b0a0e 72%)`,
        }}
      />

      {/* The trailer itself: muted, no controls, cropped to fill the card. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <iframe
          key={`video-${story}`}
          src={`https://www.youtube-nocookie.com/embed/${s.video}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`}
          title={`${s.film} trailer`}
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          className={`pointer-events-none absolute left-1/2 top-1/2 aspect-video h-full min-w-full -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
            paused ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>

      {/* Legibility scrims over the footage. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/75 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      {/* Start and end cards: a cinematic veil over the footage. */}
      {onCard && <div aria-hidden className={`absolute inset-0 bg-black/55 ${paused ? "" : "backdrop-blur-[1px]"}`} />}

      <div className="relative z-[3] flex min-h-[27rem] flex-col p-5 sm:min-h-[29.5rem] sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-white/75">
            {s.a} &amp; {s.b}
          </p>
          <p className="flex shrink-0 items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.18em] text-white/65">
            <span className={`size-1.5 rounded-full ${playing ? "bg-gold motion-safe:animate-pulse" : "bg-white/40"}`} aria-hidden />
            {playing ? "Live" : "Paused"} · {pad(story + 1)}/{pad(STORIES.length)}
          </p>
        </header>

        <div key={`scene-${story}-${phase}`} className="ls-scene flex flex-1 flex-col items-center justify-center px-2 py-6 text-center">
          {onCard && (
            <>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-white/60">
                {phase === 0 ? "A love story" : "The story of"}
              </p>
              <h3 className="font-lux mt-3 text-balance text-[2.05rem] font-medium leading-[1.04] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)] sm:text-[2.45rem]">
                <span style={{ color: s.c[0] }}>{s.a}</span>
                <span className="mx-2 text-white/40">&amp;</span>
                <span style={{ color: s.c[1] }}>{s.b}</span>
              </h3>
              <span aria-hidden className="mt-5 block h-px w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              <p className="mt-4 text-[0.78rem] leading-relaxed text-white/65">
                {phase === 0 ? "Five scenes. One heart." : s.source}
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/55 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 shrink-0 rounded-[4px] border border-white/30 px-1 py-px text-[0.55rem] font-bold tracking-wider text-white/70">
              CC
            </span>
            <p key={`cap-${story}-${phase}`} aria-live={paused ? "polite" : "off"} className="ls-scene min-h-[3rem] text-left text-[0.92rem] leading-snug text-white/95">
              {caption}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1" role="group" aria-label="Choose a story">
          {STORIES.map((it, i) => (
            <button
              key={it.a}
              type="button"
              onClick={() => show(i)}
              aria-label={`Show ${it.a} and ${it.b}`}
              aria-current={i === story ? "true" : undefined}
              className="-my-1 flex min-h-6 flex-1 items-center py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            >
              <span className={`block h-1 w-full overflow-hidden rounded-full ${i < story ? "bg-gold/70" : "bg-white/20"}`}>
                {i === story && (
                  <span
                    key={`progress-${story}`}
                    className={`block h-full w-full rounded-full bg-gold ${reduced ? "" : "ls-progress"}`}
                    style={{ animationDuration: `${TOTAL_MS}ms`, animationPlayState: playing ? "running" : "paused" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} className={ICON_BTN} aria-label="Previous story">
              <IconChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => setPaused((v) => !v)} className={ICON_BTN} aria-label={paused ? "Play the stories" : "Pause the stories"}>
              {paused ? <IconPlay size={16} /> : <IconPause size={16} />}
            </button>
            <button type="button" onClick={() => step(1)} className={ICON_BTN} aria-label="Next story">
              <IconChevronRight size={17} />
            </button>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${s.video}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[0.6rem] uppercase tracking-[0.16em] text-white/65 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
            aria-label={`Watch the ${s.film} trailer on YouTube`}
          >
            Watch trailer <IconArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}
