import { baseDark, baseLight, fontFamily, motion, radii, shadows, space, type, worldDark, worldLight } from "./tokens";

type Values = Record<string, string>;

function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();
}

function block(selector: string, values: Values, indent = ""): string {
  const body = Object.entries(values)
    .map(([key, value]) => `${indent}  --${key}: ${value};`)
    .join("\n");
  return `${indent}${selector} {\n${body}\n${indent}}`;
}

function prefixed(prefix: string, values: Values): Values {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}-${kebab(key)}`, value]));
}

function colors(values: Values): Values {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [kebab(key), value]));
}

function motionDurations(value: string): Values {
  return Object.fromEntries(Object.keys(motion.duration).map((key) => [`motion-duration-${kebab(key)}`, value]));
}

export function renderTokensCss(): string {
  const light: Values = {
    ...colors(baseLight),
    ...prefixed("font", {
      body: fontFamily.body,
      "display-stack": fontFamily.display,
      "lux-stack": fontFamily.lux,
      "lux-numeric-stack": fontFamily.luxNumeric,
      "mono-stack": fontFamily.mono,
    }),
    ...prefixed("type", type),
    ...prefixed("space", space),
    ...prefixed("radius", radii),
    ...prefixed("shadow", {
      button: shadows.button,
      card: shadows.card,
      gold: shadows.gold,
      "gold-hover": shadows.goldHover,
      lift: shadows.lift,
      tile: shadows.tileLight,
      toast: shadows.toast,
      stage: shadows.stage,
    }),
    ...prefixed("motion-duration", motion.duration),
    ...prefixed("motion-ease", motion.ease),
  };

  const dark: Values = {
    ...colors(baseDark),
    "shadow-tile": shadows.tileDark,
  };

  const worldsLight = Object.entries(worldLight)
    .map(([world, values]) => block(`[data-world="${world}"]`, colors(values)))
    .join("\n");

  const worldsDark = Object.entries(worldDark)
    .map(([world, values]) => block(`[data-world="${world}"]`, colors(values), "  "))
    .join("\n");

  const darkBlock = `@media (prefers-color-scheme: dark) {\n${block(":root", dark, "  ")}\n${worldsDark}\n}`;
  const reduced = `@media (prefers-reduced-motion: reduce) {\n${block(":root", motionDurations(motion.reducedDuration), "  ")}\n}`;

  return [block(":root", light), worldsLight, darkBlock, reduced].join("\n\n") + "\n";
}
