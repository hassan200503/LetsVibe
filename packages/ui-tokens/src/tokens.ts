export const baseLight = {
  bg: "#f7f3ec",
  surface: "#fffdf9",
  surface2: "#f1ebe1",
  ink: "#17130f",
  muted: "#6c645a",
  line: "#e5ddd0",
  focus: "#2563eb",
  gold: "#a07b43",
  goldInk: "#80602f",
  gold2: "#d7b77c",
  goldSoft: "#f4ead6",
  night: "#09070d",
  pearl: "#f6efe4",
  accent: "#c81e3a",
  accentInk: "#ffffff",
  accentSoft: "#fde8ec",
  accent2: "#b7791f",
  glow: "rgba(200, 30, 58, 0.18)",
} as const;

export const baseDark = {
  bg: "#0b0a0e",
  surface: "#141218",
  surface2: "#1c1a21",
  ink: "#f2ede5",
  muted: "#a59e9f",
  line: "#2b2831",
  focus: "#93c5fd",
  gold: "#d6b67c",
  goldInk: "#f0dcae",
  gold2: "#f0dcae",
  goldSoft: "#2a2319",
  accent: "#f0556d",
  accentInk: "#14060a",
  accentSoft: "#3a1620",
  accent2: "#e0b25c",
} as const;

export const worldLight = {
  indigo: {
    accent: "#4338ca",
    accentSoft: "#e8e7fb",
    accent2: "#0f9488",
    glow: "rgba(67, 56, 202, 0.2)",
  },
  sage: {
    accent: "#47715a",
    accentSoft: "#e6efe9",
    accent2: "#7c6fc0",
    glow: "rgba(79, 122, 99, 0.2)",
  },
  us: {
    accent: "#c81e3a",
    accentSoft: "#fde8ec",
    accent2: "#b7791f",
    glow: "rgba(200, 30, 58, 0.18)",
  },
} as const;

export const worldDark = {
  indigo: {
    accent: "#8b87ff",
    accentSoft: "#23214a",
    accent2: "#2dd4bf",
  },
  sage: {
    accent: "#8cc3a4",
    accentSoft: "#1d2e25",
    accent2: "#b4a8f0",
  },
  us: {
    accent: "#f0556d",
    accentSoft: "#3a1620",
    accent2: "#e0b25c",
  },
} as const;

export const fontFamily = {
  body: "var(--font-inter), system-ui, sans-serif",
  display: "var(--font-fraunces), Georgia, serif",
  lux: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
  luxNumeric: "var(--font-cormorant), Georgia, serif",
  mono: "var(--font-jetbrains), monospace",
} as const;

export const type = {
  eyebrowSize: "0.72rem",
  eyebrowTracking: "0.16em",
  eyebrowWeight: "700",
  eyebrowLuxSize: "0.68rem",
  eyebrowLuxTracking: "0.34em",
  eyebrowLuxWeight: "500",
  eyebrowLuxLine: "1",
  displayXlSize: "clamp(2.6rem, 7vw, 5.2rem)",
  displayXlLine: "1.02",
  displayXlTracking: "-0.03em",
  displayXlWeight: "600",
  fieldSize: "0.95rem",
  buttonSize: "0.9rem",
  chipSize: "0.75rem",
  proseSize: "1.02rem",
  proseLine: "1.75",
  monoLabelSize: "0.66rem",
} as const;

export const space = {
  "0": "0",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  fieldY: "0.6rem",
  fieldX: "0.8rem",
  buttonY: "0.55rem",
  buttonX: "1.1rem",
  buttonGoldY: "0.8rem",
  buttonGoldX: "1.4rem",
  buttonGlassX: "1.3rem",
  chipY: "0.22rem",
  chipX: "0.7rem",
} as const;

export const radii = {
  code: "6px",
  field: "12px",
  panel: "14px",
  toast: "18px",
  card: "20px",
  glow: "22px",
  tile: "24px",
  pill: "999px",
} as const;

export const shadows = {
  button:
    "0 1px 0 rgb(255 255 255 / 0.18) inset, 0 6px 18px -8px var(--glow)",
  card:
    "0 1px 0 color-mix(in oklab, var(--ink) 3%, transparent), 0 10px 30px -18px color-mix(in oklab, var(--ink) 22%, transparent)",
  gold:
    "0 1px 0 rgb(255 255 255 / 0.6) inset, 0 -1px 0 rgb(120 80 30 / 0.35) inset, 0 12px 30px -12px rgb(214 173 105 / 0.55)",
  goldHover:
    "0 1px 0 rgb(255 255 255 / 0.6) inset, 0 -1px 0 rgb(120 80 30 / 0.35) inset, 0 16px 36px -12px rgb(214 173 105 / 0.7)",
  lift: "0 28px 56px -30px var(--glow)",
  tileLight:
    "0 1px 0 rgb(255 255 255 / 0.6) inset, 0 1px 2px color-mix(in oklab, var(--ink) 4%, transparent), 0 18px 40px -28px color-mix(in oklab, var(--ink) 30%, transparent)",
  tileDark:
    "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 18px 40px -28px rgb(0 0 0 / 0.8)",
  toast: "0 24px 60px -24px rgb(0 0 0 / 0.35)",
  stage:
    "0 1px 0 rgb(255 255 255 / 0.07) inset, 0 50px 120px -50px rgb(18 6 20 / 0.6)",
} as const;

export const motion = {
  duration: {
    fast: "150ms",
    base: "200ms",
    lift: "350ms",
    reveal: "320ms",
    slow: "600ms",
    word: "1200ms",
    fade: "1400ms",
    ambient: "6000ms",
    shimmer: "9000ms",
    breathe: "7000ms",
    ring: "2200ms",
    ringShake: "1600ms",
    flash: "1600ms",
    drawer: "320ms",
    typing: "1200ms",
    caret: "1000ms",
    orbit: "70000ms",
    orbitSlow: "240000ms",
  },
  ease: {
    standard: "ease",
    inOut: "ease-in-out",
    out: "ease-out",
    linear: "linear",
    lux: "cubic-bezier(0.22, 0.8, 0.16, 1)",
  },
  reducedDuration: "0.01ms",
} as const;

export type ColorToken = keyof typeof baseLight;
export type WorldKey = keyof typeof worldLight;
export type FontToken = keyof typeof fontFamily;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radii;
export type MotionDurationToken = keyof typeof motion.duration;
export type MotionEaseToken = keyof typeof motion.ease;
