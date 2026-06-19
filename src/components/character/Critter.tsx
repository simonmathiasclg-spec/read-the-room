import { buildGrid, COLORS, GRID, type Character } from "@/lib/character";

/** Renders a pixel-critter as crisp SVG rects, on a per-player accent halo. */
export function Critter({
  character,
  size = 48,
  ring = true,
  className,
}: {
  character: Character;
  size?: number;
  ring?: boolean;
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

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      width={size}
      height={size}
      className={className}
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
            fill={`hsl(${hue} 70% 91%)`}
          />
          <rect
            x="0.45"
            y="0.45"
            width={GRID - 0.9}
            height={GRID - 0.9}
            rx="3.6"
            fill="none"
            stroke={`hsl(${hue} 70% 58%)`}
            strokeWidth="0.7"
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
