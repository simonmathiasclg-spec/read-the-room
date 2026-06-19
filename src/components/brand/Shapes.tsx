/**
 * The four Kahoot-style answer marks — color AND shape so they read for
 * color-blind players. Mapped to the PI factor colors (A/B/C/D).
 */
export type ShapeKind = "triangle" | "diamond" | "circle" | "square";

const FILL: Record<ShapeKind, string> = {
  triangle: "var(--tile-a)", // red
  diamond: "var(--tile-b)", // gold
  circle: "var(--tile-c)", // green
  square: "var(--tile-d)", // blue
};

export function Shape({
  kind,
  className,
  title,
}: {
  kind: ShapeKind;
  className?: string;
  title?: string;
}) {
  const fill = FILL[kind];
  const common = { fill };
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {kind === "triangle" && <polygon points="50,12 90,84 10,84" {...common} />}
      {kind === "diamond" && <polygon points="50,8 92,50 50,92 8,50" {...common} />}
      {kind === "circle" && <circle cx="50" cy="50" r="40" {...common} />}
      {kind === "square" && (
        <rect x="14" y="14" width="72" height="72" rx="10" {...common} />
      )}
    </svg>
  );
}

const ORDER: ShapeKind[] = ["triangle", "diamond", "circle", "square"];

/** A compact row of all four marks — used as a brand motif. */
export function ShapeRow({ className }: { className?: string }) {
  return (
    <div className={["flex items-center gap-3", className ?? ""].join(" ")}>
      {ORDER.map((kind) => (
        <Shape key={kind} kind={kind} className="size-7 sm:size-9" />
      ))}
    </div>
  );
}
