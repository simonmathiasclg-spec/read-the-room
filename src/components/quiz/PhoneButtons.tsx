"use client";

import { Glyph, TILES } from "./tiles";

/**
 * In-person mode: the phone shows ONLY the four colored shape buttons — no
 * question text — so players look up at the big screen. Full-bleed 2×2 grid
 * with big tap targets.
 */
export function PhoneButtons({
  onPick,
  disabled = false,
}: {
  onPick: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-3">
      {TILES.map((tile, i) => (
        <button
          key={tile.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(i)}
          aria-label={`Answer ${tile.label}`}
          style={{ backgroundColor: tile.bg }}
          className="flex items-center justify-center rounded-3xl shadow-[0_6px_0_rgba(0,0,0,0.28)] transition-transform duration-100 active:translate-y-[4px] active:shadow-[0_2px_0_rgba(0,0,0,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-black/40 disabled:opacity-60"
        >
          <Glyph kind={tile.kind} fill={tile.ink} className="size-1/3" />
        </button>
      ))}
    </div>
  );
}
