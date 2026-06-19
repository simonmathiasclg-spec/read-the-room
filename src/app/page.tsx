import { ButtonLink } from "@/components/ui/Button";
import { ShapeRow } from "@/components/brand/Shapes";

export default function Home() {
  return (
    <main className="wash relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Brand kicker */}
      <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-psc-gray-2">
        <span className="inline-block size-2 rotate-45 rounded-[2px] bg-psc-gold" />
        Predictive Success · Live Trivia
      </p>

      {/* Hero */}
      <h1 className="font-display text-6xl font-black leading-[0.92] tracking-tight sm:text-8xl">
        Read the
        <br />
        <span className="swoosh text-psc-red">Room</span>
      </h1>

      <p className="mt-7 max-w-md text-lg text-psc-gray-2 sm:text-xl">
        A live, Kahoot-style PI trivia game. Big screen up front, phones in
        hand, leaderboard between every question.
      </p>

      <ShapeRow className="mt-9 justify-center" />

      {/* CTAs */}
      <div className="mt-10 flex w-full max-w-md flex-col gap-4">
        <ButtonLink href="/host" size="lg" fullWidth>
          Host a game →
        </ButtonLink>
        <ButtonLink href="/play" variant="outline" size="lg" fullWidth>
          Join with a PIN
        </ButtonLink>
      </div>

      <p className="mt-14 text-xs font-semibold uppercase tracking-[0.18em] text-psc-gray-1">
        Phase 1 · Lobby &amp; live roster
      </p>
    </main>
  );
}
