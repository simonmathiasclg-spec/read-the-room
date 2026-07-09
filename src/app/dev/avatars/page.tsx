"use client";

/**
 * DEV-ONLY visual harness for the avatar system. Renders the builder, option
 * showcases, the waiting-room scatter, and the podium with mock players (no
 * Firebase) so each build step can be verified + screenshotted. Not linked.
 */

import { useEffect, useState } from "react";
import { Avatar } from "@/components/character/Avatar";
import { CharacterBuilder } from "@/components/character/CharacterBuilder";
import { CritterScatter } from "@/components/character/CritterScatter";
import { Podium } from "@/components/quiz/Podium";
import {
  HATS,
  HAT_LABELS,
  OUTFITS,
  OUTFIT_LABELS,
  PROFILES,
  makeDefaultCharacter,
  variantFor,
  type Character,
} from "@/lib/character";
import type { Player } from "@/lib/room";

function char(
  profile: string,
  bodyColor = "auto",
  outfit = "casual",
  hat = "none",
  bodyType = "skinny",
): Character {
  return { profile, bodyColor, bodyType, outfit, hat };
}

// A lobby that shows off distinctness (three Mavericks → three auto colors) plus
// a spread of outfits + hats.
const MOCK: Player[] = [
  { id: "a", name: "Ana", joinedAt: 1, score: 8200, streak: 4, character: char("Maverick", "auto", "suit", "crown") },
  { id: "b", name: "Ben", joinedAt: 2, score: 5100, streak: 0, character: char("Maverick", "auto", "gym", "cap") },
  { id: "c", name: "Cid", joinedAt: 3, score: 9400, streak: 6, character: char("Maverick", "auto", "hoodie", "beanie") },
  { id: "d", name: "Dana", joinedAt: 4, score: 7300, streak: 2, character: char("Strategist", "auto", "dress", "bow") },
  { id: "e", name: "Eli", joinedAt: 5, score: 6600, streak: 1, character: char("Promoter", "red", "hivis", "headband") },
  { id: "f", name: "Fay", joinedAt: 6, score: 4200, streak: 0, character: char("Analyzer", "auto", "varsity", "party") },
  { id: "g", name: "Gus", joinedAt: 7, score: 3800, streak: 0, character: char("Captain", "auto", "overalls", "grad") },
  { id: "h", name: "Hana", joinedAt: 8, score: 5600, streak: 3, character: char("Altruist", "auto", "casual", "flower") },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-black uppercase tracking-[0.14em] text-psc-gray-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Showcase({
  label,
  items,
  render,
}: {
  label: string;
  items: readonly string[];
  render: (key: string) => Character;
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-3xl bg-psc-ink p-5">
      {items.map((k) => (
        <div key={k} className="flex w-20 flex-col items-center gap-1">
          <Avatar character={render(k)} size={80} />
          <span className="text-xs font-bold text-white/70">{label === "outfit" ? OUTFIT_LABELS[k] : HAT_LABELS[k]}</span>
        </div>
      ))}
    </div>
  );
}

export default function DevAvatarsPage() {
  const [character, setCharacter] = useState<Character>(() =>
    makeDefaultCharacter("preview-me"),
  );
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only mount gate
  useEffect(() => setMounted(true), []);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-black">
        Avatar harness <span className="text-psc-red">/dev</span>
      </h1>

      <Section title="Signature poses (all 17)">
        <div className="grid grid-cols-6 gap-2 rounded-3xl bg-psc-ink p-5">
          {PROFILES.map((p) => (
            <div key={p} className="flex flex-col items-center gap-1">
              <Avatar character={char(p, "cobalt")} size={96} />
              <span className="text-[11px] font-bold text-white/70">{p}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Builder">
        <div className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-5 shadow-[0_2px_24px_rgba(17,17,17,0.07)]">
          <CharacterBuilder character={character} onChange={setCharacter} variant={0} />
        </div>
      </Section>

      <Section title="Outfits (on Captain)">
        <Showcase
          label="outfit"
          items={OUTFITS}
          render={(o) => char("Captain", "cobalt", o, "none")}
        />
      </Section>

      <Section title="Hats (on Captain)">
        <Showcase
          label="hat"
          items={HATS}
          render={(h) => char("Captain", "green", "casual", h)}
        />
      </Section>

      <Section title="Distinctness — three Mavericks, auto color">
        <div className="flex flex-wrap items-end gap-6 rounded-3xl bg-psc-ink p-6">
          {MOCK.filter((p) => p.character?.profile === "Maverick").map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <Avatar character={char("Maverick")} variant={variantFor(MOCK, p.id)} size={110} anim="idle" />
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-extrabold text-white">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Waiting room (host stage)">
        <div className="flex min-h-[360px] flex-col rounded-3xl bg-psc-ink p-6">
          {mounted && <CritterScatter players={MOCK} highlightId="c" />}
        </div>
      </Section>

      <Section title="Podium">
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl bg-psc-ink p-6">
          {mounted && <Podium players={MOCK} highlightId="c" />}
        </div>
      </Section>
    </main>
  );
}
