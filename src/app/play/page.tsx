"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PlayerRoster from "@/components/PlayerRoster";
import SetupNotice from "@/components/SetupNotice";
import { Wordmark } from "@/components/brand/Wordmark";
import { PhoneButtons } from "@/components/quiz/PhoneButtons";
import { Glyph, TILES } from "@/components/quiz/tiles";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  joinRoom,
  roomExists,
  submitAnswer,
  subscribeRoom,
  type Room,
} from "@/lib/room";

const PLAYER_ID_KEY = "rtr:playerId";
const SESSION_KEY = "rtr:session";

/** Full-screen "look up at the big screen" state between actions. */
function PlayerWait({
  emoji,
  title,
  subtitle,
  dark = false,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center px-6 text-center ${
        dark ? "bg-psc-ink text-white" : "wash"
      }`}
      style={{ animation: "var(--animate-rise)" }}
    >
      <span className="text-6xl" aria-hidden>
        {emoji}
      </span>
      <h1 className="mt-4 font-display text-4xl font-black sm:text-5xl">
        {title}
      </h1>
      <p className={`mt-2 text-lg ${dark ? "text-white/70" : "text-psc-gray-2"}`}>
        {subtitle}
      </p>
    </main>
  );
}

/** Stable per-device id so a dropped phone reconnects as the same player. */
function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export default function PlayPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [fromLink, setFromLink] = useState(false); // arrived via QR deep-link
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [answeredChoice, setAnsweredChoice] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  // Bootstrap: identity, deep-linked ?pin=, and auto-reconnect to a live room.
  // These are one-time syncs from browser-only sources (localStorage, the URL),
  // so the setState-in-effect calls here are intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const id = getPlayerId();
    setPlayerId(id);

    const linkedRaw = new URLSearchParams(window.location.search).get("pin");
    const linkedPin = linkedRaw ? linkedRaw.replace(/\D/g, "").slice(0, 4) : "";
    const hasValidLink = /^\d{4}$/.test(linkedPin);
    if (linkedPin) setPin(linkedPin);
    if (hasValidLink) setFromLink(true); // QR scan → just enter a name

    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as { pin: string; name: string };
      // An explicit QR/deep-link to a *different* room beats a stale session —
      // don't drag a returning player back into their old room.
      if (hasValidLink && session.pin !== linkedPin) return;
      roomExists(session.pin).then((exists) => {
        if (!exists) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }
        // Re-assert our player record and resume the lobby.
        setPin(session.pin);
        setName(session.name);
        joinRoom(session.pin, id, session.name)
          .then(() => setJoined(true))
          .catch(() => {});
      });
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live room (status, current question, roster) once we're in.
  useEffect(() => {
    if (!joined || !pin) return;
    unsubscribe.current = subscribeRoom(pin, setRoom);
    return () => {
      unsubscribe.current?.();
      unsubscribe.current = null;
    };
  }, [joined, pin]);

  // Scanned in via QR — the PIN is known, so put the cursor on the name field.
  useEffect(() => {
    if (fromLink && !joined) nameRef.current?.focus();
  }, [fromLink, joined]);

  const handleJoin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanPin = pin.trim();
      const cleanName = name.trim();
      if (!/^\d{4}$/.test(cleanPin)) {
        setError("Enter the 4-digit PIN from the big screen.");
        return;
      }
      if (!cleanName) {
        setError("Pick a name so the room knows it's you.");
        return;
      }

      setJoining(true);
      setError(null);
      try {
        if (!(await roomExists(cleanPin))) {
          setError("No room with that PIN. Check the big screen.");
          return;
        }
        await joinRoom(cleanPin, playerId, cleanName);
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ pin: cleanPin, name: cleanName }),
        );
        setJoined(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      } finally {
        setJoining(false);
      }
    },
    [pin, name, playerId],
  );

  const handleLeave = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    unsubscribe.current?.();
    unsubscribe.current = null;
    setJoined(false);
    setRoom(null);
    setName("");
  }, []);

  const handlePick = useCallback(
    (choice: number) => {
      if (!room || room.status !== "question") return;
      const qi = room.questionIndex;
      // Optimistic: lock the UI immediately, then write to Firebase.
      setAnsweredChoice(choice);
      setAnsweredIndex(qi);
      void submitAnswer(pin, qi, playerId, choice);
    },
    [room, pin, playerId],
  );

  if (!isFirebaseConfigured) return <SetupNotice />;

  // ---- Joined: lobby → question → reveal → podium ----------------------
  if (joined) {
    const status = room?.status ?? "lobby";
    const qIndex = room?.questionIndex ?? 0;
    const hasAnswered = answeredIndex === qIndex;

    // Live question, not yet answered: ONLY the four shape buttons (look up!).
    if (status === "question" && !hasAnswered) {
      return (
        <main className="flex flex-1 flex-col bg-psc-ink px-4 pb-4 pt-3">
          <p className="py-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-white/55">
            Tap your answer · look up 👀
          </p>
          <div className="min-h-0 flex-1">
            <PhoneButtons onPick={handlePick} />
          </div>
        </main>
      );
    }

    // Answered — show the chosen tile and hold.
    if (status === "question" && hasAnswered) {
      const tile = answeredChoice !== null ? TILES[answeredChoice] : null;
      return (
        <main
          className="flex flex-1 flex-col items-center justify-center gap-6 bg-psc-ink px-6 text-center text-white"
          style={{ animation: "var(--animate-pop)" }}
        >
          {tile && (
            <div
              style={{ backgroundColor: tile.bg }}
              className="flex size-28 items-center justify-center rounded-3xl shadow-[0_8px_0_rgba(0,0,0,0.3)]"
            >
              <Glyph kind={tile.kind} className="size-1/2" />
            </div>
          )}
          <div>
            <h1 className="font-display text-4xl font-black sm:text-5xl">
              Locked in!
            </h1>
            <p className="mt-2 text-lg text-white/70">
              Look up at the big screen 👀
            </p>
          </div>
        </main>
      );
    }

    if (status === "reveal") {
      return (
        <PlayerWait
          dark
          emoji="👀"
          title={hasAnswered ? "Answer locked" : "Time's up!"}
          subtitle="Check the big screen for the answer."
        />
      );
    }

    if (status === "podium") {
      return (
        <PlayerWait
          emoji="🎉"
          title="Thanks for playing!"
          subtitle="That's a wrap — look up for the results."
        />
      );
    }

    // Lobby (or room still loading).
    return (
      <main className="wash flex flex-1 flex-col items-center px-6 py-10 text-center">
        <div
          className="flex w-full max-w-md flex-1 flex-col items-center"
          style={{ animation: "var(--animate-rise)" }}
        >
          <span className="text-5xl" aria-hidden>
            🎉
          </span>
          <h1 className="mt-3 font-display text-4xl font-black sm:text-5xl">
            You&apos;re in!
          </h1>
          <p className="mt-2 text-lg text-psc-gray-2">
            <span className="font-bold text-psc-black">{name}</span> · room{" "}
            <span className="font-mono font-bold text-psc-red">{pin}</span>
          </p>

          <div className="mt-7 w-full rounded-2xl bg-psc-black px-6 py-5 text-xl font-extrabold text-white">
            👀 Look up at the big screen
          </div>

          <div className="mt-7 w-full rounded-3xl border border-black/5 bg-white p-5 text-left shadow-[0_2px_24px_rgba(17,17,17,0.07)]">
            <PlayerRoster
              players={room?.players ?? []}
              highlightId={playerId}
              emptyLabel="You're first in — hang tight!"
            />
          </div>

          <Button
            onClick={handleLeave}
            variant="ghost"
            size="sm"
            className="mt-8"
          >
            Leave room
          </Button>
        </div>
      </main>
    );
  }

  // ---- Join form -------------------------------------------------------
  return (
    <main className="wash flex flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <Wordmark className="mb-8" />
        <h1 className="font-display text-5xl font-black leading-[0.95]">
          {fromLink ? (
            <>
              Add your
              <br />
              <span className="text-psc-red">name</span>
            </>
          ) : (
            <>
              Join the
              <br />
              <span className="text-psc-red">game</span>
            </>
          )}
        </h1>

        <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-5">
          {fromLink ? (
            // Came in via QR — PIN is already known, confirm it instead of asking.
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-psc-black px-5 py-4 text-white">
              <span className="font-display text-lg font-extrabold">
                Room <span className="font-mono text-psc-gold">{pin}</span>
              </span>
              <button
                type="button"
                onClick={() => setFromLink(false)}
                className="text-sm font-semibold text-white/60 underline underline-offset-2 hover:text-white"
              >
                Use a different PIN
              </button>
            </div>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
                Game PIN
              </span>
              <input
                inputMode="numeric"
                autoComplete="off"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="1234"
                aria-label="Game PIN"
                className="rounded-2xl border-2 border-psc-gray-1 bg-white px-4 py-5 text-center font-mono text-4xl font-black tracking-[0.4em] tabular-nums outline-none transition-colors placeholder:text-psc-gray-1/50 focus:border-psc-red focus:ring-4 focus:ring-psc-red/15"
              />
            </label>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
              Your name
            </span>
            <input
              ref={nameRef}
              autoComplete="off"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              aria-label="Your name"
              className="rounded-2xl border-2 border-psc-gray-1 bg-white px-4 py-4 text-xl font-semibold outline-none transition-colors placeholder:text-psc-gray-1 focus:border-psc-red focus:ring-4 focus:ring-psc-red/15"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-psc-red/10 px-4 py-3 font-semibold text-psc-red"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={joining} size="lg" fullWidth>
            {joining ? "Joining…" : "Join game"}
          </Button>
        </form>

        <ButtonLink href="/" variant="ghost" size="sm" className="mt-6">
          ← Back
        </ButtonLink>
      </div>
    </main>
  );
}
