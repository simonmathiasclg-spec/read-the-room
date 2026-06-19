import { buildGrid, COLORS, GRID, type Character } from "@/lib/character";

/** Renders a pixel-critter as crisp SVG rects, on a per-player accent halo. */
export function Critter({
  character,
  size = 48,
  ring = true,
  anim,
  className,
}: {
  character: Character;
  size?: number;
  ring?: boolean;
  /** Optional gentle CSS motion (auto-disabled under prefers-reduced-motion). */
  anim?: "idle" | "wiggle";
  className?: string;
}) {
  const color = COLORS.find((c) => c.id === character.color) ?? COLORS[0];
  const grid = buildGrid(character.animal, character.accessory);
  const hue = character.accent ?? 0;

  const fillFor = (r: number): string => {
    switch (r) {
      case 1:
        return color.base;
      case 2:
        return color.dark;
      case 3:
        return color.light;
      case 4:
        return "#ffffff";
      case 5:
        return "#1c1c1c";
      case 6:
        return `hsl(${hue} 72% 56%)`;
      case 7:
        return "#3a2a28";
      default:
        return "transparent";
    }
  };

  const animClass =
    anim === "idle" ? "critter-idle" : anim === "wiggle" ? "critter-wiggle" : "";

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={size}
      height={size}
      className={[animClass, className].filter(Boolean).join(" ")}
      // A soft lift only when the rounded badge ring is present (won't blur the
      // bare pixel sprites used in the picker).
      style={ring ? { filter: "drop-shadow(0 1px 2px rgba(17,17,17,0.18))" } : undefined}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${character.animal} character`}
    >
      {ring && (
        <>
          <rect
            x="0"
            y="0"
            width={GRID}
            height={GRID}
            rx="4"
            fill={`hsl(${hue} 70% 92%)`}
          />
          <rect
            x="0.4"
            y="0.4"
            width={GRID - 0.8}
            height={GRID - 0.8}
            rx="3.7"
            fill="none"
            stroke={`hsl(${hue} 72% 56%)`}
            strokeWidth="0.85"
          />
        </>
      )}
      {grid.map((r, i) =>
        r ? (
          <rect
            key={i}
            x={i % GRID}
            y={Math.floor(i / GRID)}
            width="1.05"
            height="1.05"
            fill={fillFor(r)}
          />
        ) : null,
      )}
    </svg>
  );
}
