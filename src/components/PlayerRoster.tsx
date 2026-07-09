import { Avatar } from "@/components/character/Avatar";
import { assignVariants, characterFor } from "@/lib/character";
import type { Player } from "@/lib/room";

type Tone = "light" | "stage";

/** Live list of players in a room's lobby. Shared by host (stage) and player (light) views. */
export default function PlayerRoster({
  players,
  highlightId,
  tone = "light",
  emptyLabel = "Waiting for players to join…",
}: {
  players: Player[];
  highlightId?: string;
  tone?: Tone;
  emptyLabel?: string;
}) {
  const labelColor = tone === "stage" ? "text-white/55" : "text-psc-gray-2";
  const countColor = tone === "stage" ? "text-psc-gold" : "text-psc-gray-2";
  const emptyClass =
    tone === "stage"
      ? "border-white/15 text-white/55"
      : "border-psc-gray-1 text-psc-gray-2";

  return (
    <section className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          className={`text-xs font-bold uppercase tracking-[0.18em] ${labelColor}`}
        >
          Players
        </h2>
        <span className={`text-base font-extrabold tabular-nums ${countColor}`}>
          {players.length}
        </span>
      </div>

      {players.length === 0 ? (
        <p
          className={`rounded-2xl border border-dashed px-4 py-7 text-center font-medium ${emptyClass}`}
        >
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {(() => {
            const variants = assignVariants(players);
            return players.map((p) => {
            const isMe = p.id === highlightId;
            const chip = isMe
              ? "bg-psc-red text-white shadow-[0_3px_0_var(--psc-red-deep)]"
              : tone === "stage"
                ? "bg-white/10 text-white"
                : "bg-psc-gold/15 text-psc-black";
            return (
              <li
                key={p.id}
                style={{ animation: "var(--animate-pop)" }}
                className={`flex max-w-[14rem] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-base font-bold sm:text-lg ${chip}`}
              >
                <Avatar
                  character={characterFor(p)}
                  variant={variants[p.id] ?? 0}
                  size={40}
                />
                <span className="truncate">
                  {p.name}
                  {isMe ? " · you" : ""}
                </span>
              </li>
            );
            });
          })()}
        </ul>
      )}
    </section>
  );
}
