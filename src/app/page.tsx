import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 inline-block h-1 w-16 rounded-full bg-psc-gold" />
      <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
        Read the <span className="text-psc-red">Room</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-psc-gray-2">
        A live, Kahoot-style PI trivia game for Predictive Success workshops.
      </p>

      <div className="mt-12 flex w-full max-w-md flex-col gap-4">
        <Link
          href="/host"
          className="rounded-2xl bg-psc-red px-8 py-5 text-xl font-bold text-white shadow-lg shadow-psc-red/20 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-psc-red"
        >
          Host a room →
        </Link>
        <Link
          href="/play"
          className="rounded-2xl border-2 border-psc-black px-8 py-5 text-xl font-bold text-psc-black transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-psc-black"
        >
          Join with a PIN
        </Link>
      </div>

      <p className="mt-16 text-sm text-psc-gray-1">
        Phase 1 · lobby &amp; live roster
      </p>
    </main>
  );
}
