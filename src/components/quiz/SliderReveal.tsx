import type { SliderFactor } from "@/lib/questions";

const FACTOR_COLOR: Record<SliderFactor["key"], string> = {
  A: "var(--tile-a)",
  B: "var(--tile-b)",
  C: "var(--tile-c)",
  D: "var(--tile-d)",
};

/**
 * Host slider reveal: for each factor, the target zone (±tolerance) with the
 * exact target marked, plus where the room actually placed (faint dots + the
 * average). Teaches the real PI shape.
 */
export function SliderReveal({
  factors,
  tolerance,
  placements,
}: {
  factors: SliderFactor[];
  tolerance: number;
  placements: number[][];
}) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white/[0.04] px-4 py-4 ring-1 ring-white/10 sm:px-7 sm:py-5">
      <div className="mb-3 flex justify-center gap-5 text-xs font-semibold text-white/55">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-tile-c/40" /> target zone
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-white" /> where the room placed
        </span>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {factors.map((f, i) => {
          const target = Math.max(0, Math.min(100, f.target));
          const lo = Math.max(0, target - tolerance);
          const hi = Math.min(100, target + tolerance);
          const placed = placements
            .map((p) => p[i])
            .filter((v) => typeof v === "number");
          const avg = placed.length
            ? Math.round(placed.reduce((a, b) => a + b, 0) / placed.length)
            : null;
          return (
            <div
              key={f.key}
              className="grid grid-cols-[1.4rem_5rem_1fr_5rem] items-center gap-2 sm:grid-cols-[1.75rem_7rem_1fr_7rem] sm:gap-3"
            >
              <span
                className="flex size-5 items-center justify-center rounded-md font-display text-xs font-black text-white sm:size-7 sm:text-sm"
                style={{ backgroundColor: FACTOR_COLOR[f.key] }}
                aria-hidden
              >
                {f.key}
              </span>
              <span className="text-right text-[0.7rem] font-semibold leading-tight text-white/55 sm:text-sm">
                {f.low}
              </span>
              <div className="relative h-3 rounded-full bg-white/12">
                {/* tolerance band */}
                <span
                  className="absolute top-0 h-full rounded-full bg-tile-c/40"
                  style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                />
                {/* exact target */}
                <span
                  className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-psc-gold shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
                  style={{ left: `${target}%` }}
                />
                {/* individual placements */}
                {placed.map((v, idx) => (
                  <span
                    key={idx}
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45"
                    style={{ left: `${v}%` }}
                  />
                ))}
                {/* room average */}
                {avg !== null && (
                  <span
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-black/30 sm:size-5"
                    style={{ left: `${avg}%` }}
                  />
                )}
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
