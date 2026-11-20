export const baseLight = {
  bg: "#f7f3ec",
  /** The rail and other persistent chrome sit a shade deeper than the page. */
  canvas: "#f1ece3",
  surface: "#fffdf9",
  surface2: "#f1ebe1",
  scrim: "rgb(23 19 15 / 0.42)",
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
  /** Reachable links and unread/read affordances, distinct from the couple accent. */
  link: "#1d5fd0",
  linkSoft: "#e6eeff",
  /** Status: measured at or above 4.5:1 on `bg` in this scheme. */
  success: "#1a6b45",
  successInk: "#ffffff",
  successSoft: "#e2f1e8",
  warn: "#8a5a00",
  warnInk: "#ffffff",
  warnSoft: "#f8eed4",
  danger: "#b3261e",
  dangerInk: "#ffffff",
  dangerSoft: "#fce7e4",
  /** Fixed tints for permanently dark surfaces (calls, the media viewer). */
  onDark: "#f4efe7",
  onDarkMuted: "#a9a2a0",
  successOnDark: "#3ddc84",
  dangerOnDark: "#ff6b7a",
  goldOnDark: "#e7c98d",
  nightSoft: "#17131c",
} as const;

export const baseDark = {
  bg: "#0b0a0e",
  canvas: "#0f0d12",
  surface: "#141218",
  surface2: "#1c1a21",
  scrim: "rgb(0 0 0 / 0.62)",
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
  link: "#8ec5ff",
  linkSoft: "#16233a",
  success: "#5fd39a",
  successInk: "#04150c",
  successSoft: "#12291d",
  warn: "#f0c66b",
  warnInk: "#1c1406",
  warnSoft: "#2a2211",
  danger: "#ff8a95",
  dangerInk: "#210508",
  dangerSoft: "#3a1620",
  onDark: "#f4efe7",
  onDarkMuted: "#a9a2a0",
  successOnDark: "#3ddc84",
  dangerOnDark: "#ff6b7a",
  goldOnDark: "#e7c98d",
  nightSoft: "#17131c",
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
  /** Interface ladder: one scale for app chrome and dense content. */
  pageTitleSize: "clamp(1.9rem, 4.2vw, 2.75rem)",
  pageTitleLine: "1.08",
  pageTitleTracking: "-0.022em",
  pageTitleWeight: "600",
  sectionTitleSize: "1.35rem",
  sectionTitleLine: "1.25",
  sectionTitleTracking: "-0.01em",
  sectionTitleWeight: "600",
  cardTitleSize: "1.02rem",
  cardTitleLine: "1.35",
  cardTitleWeight: "600",
  bodySize: "0.95rem",
  bodyLine: "1.6",
  smallSize: "0.82rem",
  smallLine: "1.45",
  metaSize: "0.72rem",
  metaLine: "1.35",
  metaTracking: "0.01em",
  labelSize: "0.8rem",
  labelWeight: "600",
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
  /** Chrome measurements shared by the web shell. */
  rail: "15.5rem",
  railCompact: "5rem",
  container: "72rem",
  containerWide: "84rem",
  header: "3.75rem",
  mobileNav: "4.25rem",
  touch: "2.75rem",
} as const;

export const radii = {
  code: "6px",
  control: "10px",
  field: "12px",
  panel: "14px",
  media: "16px",
  toast: "18px",
  card: "18px",
  glow: "22px",
  tile: "24px",
  sheet: "28px",
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
  /** Interface chrome: quiet, close to the surface, never decorative. */
  hairline: "0 1px 2px color-mix(in oklab, var(--ink) 4%, transparent)",
  pop: "0 2px 6px -2px color-mix(in oklab, var(--ink) 12%, transparent), 0 12px 32px -12px color-mix(in oklab, var(--ink) 22%, transparent)",
  sheet: "0 24px 80px -24px color-mix(in oklab, var(--ink) 38%, transparent)",
} as const;

export const motion = {
  duration: {
    press: "110ms",
    fast: "150ms",
    base: "200ms",
    enter: "240ms",
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
