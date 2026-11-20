/**
 * The night sky of the home stage: a field of stars at fixed positions, so the
 * server and browser draw the same sky. Pure SVG and CSS; still for anyone who
 * prefers reduced motion.
 */
const rand = (i: number, n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;

export function Starfield({ count = 140 }: { count?: number }) {
  return (
    <svg className="stars pointer-events-none absolute inset-0 -z-10 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const big = rand(i, 3) > 0.93;
        return (
          <circle
            key={i}
            cx={(rand(i, 1) * 1600).toFixed(1)}
            cy={(rand(i, 2) * 900).toFixed(1)}
            r={(big ? 1.3 + rand(i, 4) : 0.35 + rand(i, 4) * 0.8).toFixed(2)}
            opacity={(0.25 + rand(i, 5) * 0.6).toFixed(2)}
            className={rand(i, 6) > 0.6 ? "tw" : undefined}
            style={{ animationDelay: `${(rand(i, 7) * 5).toFixed(2)}s`, animationDuration: `${(3 + rand(i, 8) * 5).toFixed(2)}s` }}
          />
        );
      })}
    </svg>
  );
}

