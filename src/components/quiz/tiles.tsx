import type { ShapeKind } from "@/components/brand/Shapes";

/**
 * The four answer tiles, in A/B/C/D order. Per CLAUDE.md each pairs a brand
 * factor color with a distinct shape so they read for color-blind players.
 *
 * `ink` is the readable foreground for that tile: white on the dark tiles, but
 * near-black on the light gold tile (white-on-gold is only ~2:1 and fails WCAG).
 */
export const TILES: {
  kind: ShapeKind;
  bg: string;
  ink: string;
  label: string;
}[] = [
  { kind: "triangle", bg: "var(--tile-a)", ink: "#ffffff", label: "A" }, // red
  { kind: "diamond", bg: "var(--tile-b)", ink: "#111111", label: "B" }, // gold → dark ink
  { kind: "circle", bg: "var(--tile-c)", ink: "#ffffff", label: "C" }, // green
  { kind: "square", bg: "var(--tile-d)", ink: "#ffffff", label: "D" }, // blue
];

/** A shape glyph drawn on a colored tile, in that tile's readable ink color. */
export function Glyph({
  kind,
  className,
  fill = "#ffffff",
}: {
  kind: ShapeKind;
  className?: string;
  fill?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill={fill}>
      {kind === "triangle" && <polygon points="50,14 88,82 12,82" />}
      {kind === "diamond" && <polygon points="50,10 90,50 50,90 10,50" />}
      {kind === "circle" && <circle cx="50" cy="50" r="38" />}
      {kind === "square" && <rect x="16" y="16" width="68" height="68" rx="9" />}
    </svg>
  );
}
