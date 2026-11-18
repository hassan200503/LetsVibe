"use client";

import Link from "next/link";
import { type FormEvent, useActionState, useId, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { archiveRitual, createRitual } from "@/lib/rituals/actions";
import type { RitualsData, RitualView } from "@/lib/rituals/queries";
import { nextMilestone } from "@/lib/rituals/streak";
import { Avatar } from "@/components/avatar";
import { useMembers, type Member } from "@/components/me-context";
import { IconArrowRight, IconCheck, IconClock, IconPlus, IconTrash } from "@/components/icons";
import { useRitualTaps } from "./use-rituals";

const EMOJIS = ["✷", "☀️", "🌙", "💌", "📸", "🎧", "☕", "🚶", "🌿", "🍳", "📖", "🎵", "🤝", "✨", "🐦", "💪"];

const STARTERS: { emoji: string; title: string; detail: string; cadence?: "weekly" }[] = [
  { emoji: "☀️", title: "Good-morning text", detail: "One line before the day starts." },
  { emoji: "🌙", title: "Goodnight voice note", detail: "Ten seconds, in your own voice." },
  { emoji: "📸", title: "One photo of today", detail: "Anything either of you saw." },
  { emoji: "☕", title: "Coffee on a call", detail: "Five minutes, whenever the day allows." },
  { emoji: "🚶", title: "A walk together", detail: "Same time each week, wherever you are.", cadence: "weekly" },
  { emoji: "💌", title: "Today's question", detail: "Answer yours, then read theirs." },
];

const WEEKDAY = (day: string) => (((Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000) + 3) % 7) + 7) % 7;
const prettyDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** The streak, drawn as a ring that fills toward the next round number. */
function StreakRing({ current, goal }: { current: number; goal: number }) {
  const size = 156;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, current / goal));
  const id = useId();
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 0.8, 0.16, 1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="num-lux text-[3.2rem] leading-none text-ink">{current}</p>
        <p className="mt-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">day{current === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 px-4 py-3">
      <p className="num-lux text-2xl leading-none text-ink">{value}</p>
      <p className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}

function WeekDots({ last7 }: { last7: boolean[] }) {
  return (
    <span className="hidden items-center gap-1 sm:flex" aria-hidden>
      {last7.map((on, i) => (
        <span key={i} className={`size-[7px] rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`} />
      ))}
    </span>
  );
}

function Row({
  ritual,
  byOthers,
  isKept,
  onToggle,
}: {
  ritual: RitualView;
  byOthers: Member[];
  isKept: (r: RitualView) => boolean;
  onToggle: (r: RitualView) => void;
}) {
  const [busy, setBusy] = useState(false);
  // A weekly ritual is kept for the whole week once either of you taps it.
  const weeklyDone = ritual.cadence === "weekly" && ritual.keptThisWeek;
  const on = weeklyDone || isKept(ritual);
  const meta = [
    ritual.cadence === "weekly" ? "Every week" : ritual.atTime ? `Every day · ${ritual.atTime}` : "Every day",
    ritual.cadence === "daily" && ritual.streak > 1 ? `${ritual.streak}-day run` : null,
  ].filter(Boolean) as string[];

  const putAway = () => {
    if (!confirm(`Put “${ritual.title}” away? Its days stay kept.`)) return;
    setBusy(true);
    void archiveRitual(ritual.id).finally(() => setBusy(false));
  };

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50 sm:gap-4 sm:px-5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl transition-colors ${on ? "bg-accent-soft" : "bg-surface-2"}`} aria-hidden>
        {ritual.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-tight">{ritual.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {byOthers.length > 0 && (
            <span className="flex items-center gap-1.5 font-medium text-success">
              <span className="flex -space-x-1.5">
                {byOthers.map((m) => (
                  <Avatar key={m.id} name={m.displayName} url={m.avatarUrl} theme={m.theme} size={16} className="rounded-full ring-2 ring-surface" />
                ))}
              </span>
              kept it {ritual.cadence === "weekly" ? "this week" : "today"}
            </span>
          )}
          {meta.map((m, i) => (
            <span key={m} className="flex items-center gap-2">
              {(i > 0 || byOthers.length > 0) && <span className="size-1 rounded-full bg-line" aria-hidden />}
              {m}
            </span>
          ))}
          <button
            type="button"
            onClick={putAway}
            disabled={busy}
            className="text-muted/80 underline decoration-line underline-offset-2 transition hover:text-danger sm:hidden"
          >
            Put away
          </button>
        </p>
      </div>
      {ritual.cadence === "daily" && <WeekDots last7={ritual.last7} />}
      <button
        type="button"
        onClick={() => onToggle(ritual)}
        disabled={weeklyDone}
        aria-pressed={on}
        aria-label={weeklyDone ? `${ritual.title} is kept this week` : on ? `Un-keep ${ritual.title} for today` : `Keep ${ritual.title} for today`}
        className={`grid size-11 shrink-0 place-items-center rounded-full border transition active:scale-90 ${
          on ? "border-transparent bg-accent text-accent-ink shadow-[0_6px_18px_-8px_var(--glow)]" : "border-line text-muted hover:border-accent hover:text-accent"
        }`}
      >
        <IconCheck size={19} strokeWidth={2.4} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={putAway}
        aria-label={`Put ${ritual.title} away`}
        className="hidden size-9 shrink-0 place-items-center rounded-full text-muted/60 transition hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 sm:grid sm:opacity-0 sm:group-hover:opacity-100"
      >
        <IconTrash size={15} />
      </button>
    </li>
  );
}

function SubmitChip({ emoji, title, detail }: { emoji: string; title: string; detail: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tile lift group flex items-start gap-3 p-4 text-left transition disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-lg" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-semibold leading-tight">
          {title}
          <IconPlus size={14} className="opacity-0 transition group-hover:opacity-100" />
        </span>
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      </span>
    </button>
  );
}

function Starter({ s }: { s: (typeof STARTERS)[number] }) {
  const [state, action] = useActionState(createRitual, null);
  return (
    <form action={action}>
      <input type="hidden" name="emoji" value={s.emoji} />
      <input type="hidden" name="title" value={s.title} />
      <input type="hidden" name="detail" value={s.detail} />
      <input type="hidden" name="cadence" value={s.cadence ?? "daily"} />
      <SubmitChip emoji={s.emoji} title={s.title} detail={s.detail} />
      {state?.error && (
        <p role="alert" className="mt-2 px-1 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Rhythm({ rhythm, today }: { rhythm: RitualsData["rhythm"]; today: string }) {
  const lead = WEEKDAY(rhythm[0].day);
  const kept = rhythm.filter((d) => d.kept > 0).length;
  const shade = (n: number) => (n === 0 ? "bg-surface-2" : n === 1 ? "bg-accent/25" : n === 2 ? "bg-accent/45" : n === 3 ? "bg-accent/65" : "bg-accent");
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow-lux">Twelve weeks of us</p>
          <p className="mt-2 text-sm text-muted">
            {kept === 0 ? "Nothing marked yet — the first square is today." : `${kept} day${kept === 1 ? "" : "s"} kept in the last twelve weeks.`}
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`Your rhythm for the last twelve weeks: ${kept} days kept.`}
          className="grid w-max grid-flow-col grid-rows-7 gap-1"
        >
          {Array.from({ length: lead }, (_, i) => (
            <span key={`lead-${i}`} className="size-3" />
          ))}
          {rhythm.map((d) => (
            <span
              key={d.day}
              title={`${prettyDay(d.day)} — ${d.kept === 0 ? "nothing kept" : `${d.kept} kept`}`}
              className={`size-3 rounded-[4px] ${shade(d.kept)} ${d.day === today ? "ring-1 ring-accent/70 ring-offset-1 ring-offset-surface" : ""}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-muted">
        Less
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n} className={`size-2.5 rounded-[3px] ${shade(n)}`} aria-hidden />
        ))}
        More
      </p>
    </div>
  );
}

function NewRitual() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    start(async () => {
      const result = await createRitual(null, data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      form.current?.reset();
      setOpen(false);
    });
  };

  return (
    <div className="tile overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          <IconPlus size={18} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold leading-tight">Start a new ritual</span>
          <span className="mt-0.5 block text-sm text-muted">Something small you both want to do on repeat.</span>
        </span>
        <IconArrowRight size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <form ref={form} onSubmit={submit} className="border-t border-line px-5 py-5">
          <fieldset>
            <legend className="eyebrow-lux">Pick a symbol</legend>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EMOJIS.map((e, i) => (
                <label key={e} className="cursor-pointer">
                  <input type="radio" name="emoji" value={e} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-lg transition peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
                    {e}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="eyebrow-lux">Name</span>
              <input name="title" required maxLength={80} placeholder="Good-morning text" className="field mt-2 w-full" />
            </label>
            <label className="block sm:col-span-2">
              <span className="eyebrow-lux">Why it matters (optional)</span>
              <input name="detail" maxLength={240} placeholder="Because the day feels warmer when it starts with you." className="field mt-2 w-full" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-6">
            <fieldset>
              <legend className="eyebrow-lux">How often</legend>
              <div className="mt-2 inline-flex rounded-full border border-line bg-surface p-1">
                {["daily", "weekly"].map((c, i) => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="cadence" value={c} defaultChecked={i === 0} className="peer sr-only" />
                    <span className="block rounded-full px-4 py-1.5 text-sm font-medium text-muted transition peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:ring-2 peer-focus-visible:ring-focus">
                      {c === "daily" ? "Every day" : "Every week"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="eyebrow-lux">When (optional)</span>
              <input type="time" name="atTime" className="field mt-2" />
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3">
            <button className="btn" data-world="us" disabled={pending}>
              {pending ? "Adding…" : "Add this ritual"}
            </button>
            <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setOpen(false)}>
              Not now
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function RitualBoard({ data }: { data: RitualsData }) {
  const members = useMembers();
  const taps = useRitualTaps(data.rituals);
  const { streak } = data;
  const goal = nextMilestone(streak.current);
  const daily = data.rituals.filter((r) => r.cadence === "daily");
  const weekly = data.rituals.filter((r) => r.cadence === "weekly");
  const partnerFirst = members[1]?.displayName.split(" ")[0] ?? "They";
  const theirs = members.slice(1);

  const status = streak.keptToday
    ? streak.current === 1
      ? "Your rhythm starts today. Nothing to catch up on."
      : "Today is kept. That's the whole job."
    : streak.atRisk
      ? `Today is still open — one tap and your run keeps going.`
      : streak.current === 0 && streak.best > 0
        ? "A run that paused is still yours. Today starts the next one."
        : "No pressure here. Tap one thing when it feels right.";

  const allDailyKept = daily.length > 0 && daily.every((r) => taps.kept(r));

  return (
    <div className="space-y-6">
      {/* ── THE STREAK ───────────────────────────────────────────── */}
      <section className="tile relative overflow-hidden p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle,var(--gold-soft),transparent_70%)]" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr]">
          <div className="mx-auto lg:mx-0">
            <StreakRing current={streak.current} goal={goal} />
          </div>
          <div>
            <p className="eyebrow-lux">Our rhythm</p>
            <h2 className="font-lux mt-3 text-[1.9rem] font-medium leading-[1.1] tracking-tight sm:text-[2.3rem]">
              {streak.current > 0 ? (
                <>
                  {streak.current} day{streak.current === 1 ? "" : "s"} of showing up for each other
                </>
              ) : (
                <>A rhythm you build together, not on your own</>
              )}
            </h2>
            <p className="mt-3 max-w-xl text-muted">{status}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Stat label="Longest run" value={`${streak.best}`} />
              <Stat label="Days kept" value={`${streak.total}`} />
              <Stat label="Next mark" value={`${goal}`} />
            </div>
            {taps.openToday > 1 && (
              <button className="btn mt-6" data-world="us" onClick={taps.keepAll} disabled={taps.pending}>
                <IconCheck size={16} /> Keep all {taps.openToday} for today
              </button>
            )}
            {taps.error && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {taps.error}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── TODAY ────────────────────────────────────────────────── */}
      <section className="tile overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow-lux">Today</p>
            <p className="mt-1.5 text-sm text-muted">
              {daily.length === 0
                ? "Add your first ritual and it shows up here every morning."
                : allDailyKept
                  ? `Everything kept. ${partnerFirst} will see it the moment they look.`
                  : `${taps.openToday} of ${daily.length} still open — either of you keeping one keeps it for both.`}
            </p>
          </div>
          {daily.length > 0 && allDailyKept && (
            <span role="img" className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success" aria-label="All kept today">
              <IconCheck size={17} strokeWidth={2.4} />
            </span>
          )}
        </header>
        {daily.length > 0 ? (
          <ul className="divide-y divide-line">
            {daily.map((r) => (
              <Row key={r.id} ritual={r} byOthers={theirs} isKept={taps.kept} onToggle={taps.toggle} />
            ))}
          </ul>
        ) : null}
      </section>

      {/* ── STARTERS ─────────────────────────────────────────────── */}
      {data.rituals.length === 0 && (
        <section>
          <p className="eyebrow-lux">Start with one of these</p>
          <p className="mt-2 max-w-2xl text-muted">One tap adds it to both your phones. You can rename it, or put it away, whenever it stops fitting.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STARTERS.map((s) => (
              <Starter key={s.title} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── WEEKLY ───────────────────────────────────────────────── */}
      {weekly.length > 0 && (
        <section className="tile overflow-hidden">
          <header className="border-b border-line px-5 py-4">
            <p className="eyebrow-lux">This week</p>
            <p className="mt-1.5 text-sm text-muted">The ones you do once — no streak to lose, just a thing to look forward to.</p>
          </header>
          <ul className="divide-y divide-line">
            {weekly.map((r) => (
              <Row key={r.id} ritual={r} byOthers={theirs} isKept={taps.kept} onToggle={taps.toggle} />
            ))}
          </ul>
        </section>
      )}

      {/* ── RHYTHM ───────────────────────────────────────────────── */}
      <section className="tile p-5 sm:p-7">
        <Rhythm rhythm={data.rhythm} today={data.today} />
      </section>

      <NewRitual />

      <p className="flex items-center justify-center gap-2 pb-2 text-xs text-muted">
        <IconClock size={14} /> A new day turns over at midnight in your shared time zone, so you both always see the same today.
        <Link href="/together" className="hidden items-center gap-1 font-semibold text-gold-ink underline-offset-4 hover:underline sm:inline-flex">
          Together <IconArrowRight size={13} />
        </Link>
      </p>
    </div>
  );
}
