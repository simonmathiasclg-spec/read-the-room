"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SliderFactor } from "@/lib/questions";

const FACTOR_COLOR: Record<SliderFactor["key"], string> = {
  A: "var(--tile-a)",
  B: "var(--tile-b)",
  C: "var(--tile-c)",
  D: "var(--tile-d)",
};

/**
 * Phone "build the profile": one Low↔High slider per factor. The player drags
 * each thumb (starting at the midpoint) then locks in. Submits a 0–100 value
 * per factor, in factor order.
 */
export function PhoneSlider({
  prompt,
  factors,
  onSubmit,
  disabled = false,
}: {
  prompt: string;
  factors: SliderFactor[];
  onSubmit: (placement: number[]) => void;
  disabled?: boolean;
}) {
  const [vals, setVals] = useState<number[]>(() => factors.map(() => 50));

  const setAt = (i: number, v: number) =>
    setVals((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <p className="px-1 pb-1 text-center font-display text-xl font-extrabold text-white">
        {prompt}
      </p>
      <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto py-3">
        {factors.map((f, i) => {
          const color = FACTOR_COLOR[f.key];
          return (
            <div key={f.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-white">
                  {f.label}
                </span>
                <span className="tabular-nums text-sm font-semibold text-white/45">
                  {vals[i]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={vals[i]}
                disabled={disabled}
                onChange={(e) => setAt(i, Number(e.target.value))}
                aria-label={f.label}
                className="rtr-range"
                style={
                  {
                    "--rng": color,
                    display: "block",
                    width: "100%",
                    background: `linear-gradient(to right, ${color} ${vals[i]}%, rgba(255,255,255,0.15) ${vals[i]}%)`,
                  } as React.CSSProperties
                }
              />
              <div className="mt-1.5 flex justify-between text-xs font-semibold text-white/50">
                <span>{f.low}</span>
                <span>{f.high}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        onClick={() => onSubmit(vals)}
        disabled={disabled}
        size="lg"
        fullWidth
        className="mt-2"
      >
        Lock it in
      </Button>
    </div>
  );
}
