import type { GraphPattern } from "@/lib/questions";

/**
 * The four PI continua, each Low↔High, with the factor's brand color. Values are
 * 0–100 (far left = low end, far right = high end), matching the People Data
 * Toolkit layout.
 */
const FACTORS: {
  key: keyof GraphPattern;
  letter: string;
  low: string;
  high: string;
  color: string;
}[] = [
  { key: "A", letter: "A", low: "Collaborative", high: "Independent", color: "var(--tile-a)" },
  { key: "B", letter: "B", low: "Reserved", high: "Sociable", color: "var(--tile-b)" },
  { key: "C", letter: "C", low: "Driving", high: "Steady", color: "var(--tile-c)" },
  { key: "D", letter: "D", low: "Flexible", high: "Precise", color: "var(--tile-d)" },
];

/** Host-only render of a PI pattern: a dot on each of the four continua. */
export function PatternGraph({ pattern }: { pattern: GraphPattern }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white/[0.04] px-4 py-4 ring-1 ring-white/10 sm:px-7 sm:py-5">
      <div className="space-y-3 sm:space-y-4">
        {FACTORS.map((f) => {
          const v = Math.max(0, Math.min(100, pattern[f.key]));
          return (
            <div
              key={f.key}
              className="grid grid-cols-[1.4rem_5.5rem_1fr_5.5rem] items-center gap-2 sm:grid-cols-[1.75rem_7rem_1fr_7rem] sm:gap-3"
            >
              <span
                className="flex size-5 items-center justify-center rounded-md font-display text-xs font-black text-white sm:size-7 sm:text-sm"
                style={{ backgroundColor: f.color }}
                aria-hidden
              >
                {f.letter}
              </span>
              <span className="text-right text-[0.7rem] font-semibold leading-tight text-white/55 sm:text-sm">
                {f.low}
              </span>
              <div className="relative h-2.5 rounded-full bg-white/12">
                <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-white/25" />
                <span
                  className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.4)] ring-2 ring-white sm:size-5"
                  style={{ left: `${v}%`, backgroundColor: f.color }}
                />
              </div>
              <span className="text-left text-[0.7rem] font-semibold leading-tight text-white/55 sm:text-sm">
                {f.high}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
