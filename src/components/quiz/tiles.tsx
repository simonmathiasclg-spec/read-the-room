import type { ShapeKind } from "@/components/brand/Shapes";

/**
 * The four answer tiles, in A/B/C/D order. Per CLAUDE.md each pairs a brand
 * factor color with a distinct shape so they read for color-blind players.
 */
export const TILES: { kind: ShapeKind; bg: string; label: string }[] = [
  { kind: "triangle", bg: "var(--tile-a)", label: "A" }, // red
  { kind: "diamond", bg: "var(--tile-b)", label: "B" }, // gold
  { kind: "circle", bg: "var(--tile-c)", label: "C" }, // green
  { kind: "square", bg: "var(--tile-d)", label: "D" }, // blue
];

/** A white shape glyph drawn on a colored tile. */
export function Glyph({ kind, className }: { kind: ShapeKind; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="#fff">
      {kind === "triangle" && <polygon points="50,14 88,82 12,82" />}
      {kind === "diamond" && <polygon points="50,10 90,50 50,90 10,50" />}
      {kind === "circle" && <circle cx="50" cy="50" r="38" />}
      {kind === "square" && <rect x="16" y="16" width="68" height="68" rx="9" />}
    </svg>
  );
}
