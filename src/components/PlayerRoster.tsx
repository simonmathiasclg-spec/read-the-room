import type { Player } from "@/lib/room";

/** Live list of players in a room's lobby. Shared by host and player views. */
export default function PlayerRoster({
  players,
  highlightId,
}: {
  players: Player[];
  highlightId?: string;
}) {
  return (
    <section className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-psc-gray-2">
          Players
        </h2>
        <span className="text-sm font-bold tabular-nums text-psc-gray-2">
          {players.length}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="rounded-xl border border-dashed border-psc-gray-1 px-4 py-6 text-center text-psc-gray-2">
          Waiting for players to join…
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.map((p) => {
            const isMe = p.id === highlightId;
            return (
              <li
                key={p.id}
                className={[
                  "truncate rounded-xl px-4 py-3 text-center font-semibold",
                  isMe
                    ? "bg-psc-red text-white"
                    : "bg-psc-gold/15 text-psc-black",
                ].join(" ")}
              >
                {p.name}
                {isMe ? " (you)" : ""}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
