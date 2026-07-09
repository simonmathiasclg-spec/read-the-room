"use client";

/**
 * DEV-ONLY static avatar harness (no continuous animation, so it screenshots
 * cleanly). Shows signature poses, matched-color distinctness, body types,
 * outfits, hats, and emotes for verifying each redesign step. Not linked.
 */

import { Avatar } from "@/components/character/Avatar";
import {
  EMOTES,
  HATS,
  HAT_LABELS,
  OUTFITS,
  OUTFIT_LABELS,
  PROFILES,
  type Character,
} from "@/lib/character";

const c = (over: Partial<Character>): Character => ({
  profile: "Captain",
  bodyColor: "cobalt",
  outfit: "casual",
  hat: "none",
  ...over,
});

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-[11px] font-bold text-white/70">{label}</span>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-sm font-black uppercase tracking-[0.14em] text-psc-gray-2">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 rounded-3xl bg-psc-ink p-5">{children}</div>
    </section>
  );
}

export default function DevPosesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl font-black">
        Avatar poses <span className="text-psc-red">/dev</span>
      </h1>

      <Row title="Signature poses — all 17">
        {PROFILES.map((p) => (
          <Cell key={p} label={p}>
            <Avatar character={c({ profile: p })} size={104} />
          </Cell>
        ))}
      </Row>

      <Row title="Distinctness — same profile, auto colors (variant 0–5)">
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <Cell key={v} label={`#${v + 1}`}>
            <Avatar character={c({ profile: "Maverick", bodyColor: "auto" })} variant={v} size={104} />
          </Cell>
        ))}
      </Row>

      <Row title="Outfits (on Persuader)">
        {OUTFITS.map((o) => (
          <Cell key={o} label={OUTFIT_LABELS[o]}>
            <Avatar character={c({ profile: "Persuader", bodyColor: "red", outfit: o })} size={96} />
          </Cell>
        ))}
      </Row>

      <Row title="Hats (on Promoter)">
        {HATS.map((h) => (
          <Cell key={h} label={HAT_LABELS[h]}>
            <Avatar character={c({ profile: "Promoter", bodyColor: "green", hat: h })} size={96} />
          </Cell>
        ))}
      </Row>

      <Row title="Emotes (on Collaborator)">
        {EMOTES.map((e) => (
          <Cell key={e.key} label={e.label}>
            <Avatar character={c({ profile: "Collaborator", bodyColor: "violet" })} emote={e.key} size={104} />
          </Cell>
        ))}
      </Row>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-sm font-black uppercase tracking-[0.14em] text-psc-gray-2">
          Podium — default celebration
        </h2>
        <div className="flex items-end justify-center gap-6 rounded-3xl bg-psc-ink px-6 pt-6">
          {[
            { p: "Strategist", col: "violet", place: 2, h: "h-24" },
            { p: "Maverick", col: "orange", place: 1, h: "h-36", big: true },
            { p: "Guardian", col: "teal", place: 3, h: "h-16" },
          ].map((s) => (
            <div key={s.place} className="flex flex-col items-center">
              <Avatar character={c({ profile: s.p, bodyColor: s.col })} celebrating size={s.big ? 208 : 128} />
              <span className="mt-1 font-display text-lg font-black text-white">{s.p}</span>
              <div className={`mt-2 flex w-24 items-start justify-center rounded-t-2xl pt-2 ${s.h} ${s.place === 1 ? "bg-psc-gold" : s.place === 2 ? "bg-psc-gray-1" : "bg-[#cd7f32]"}`}>
                <span className="font-display text-2xl font-black text-psc-black">{s.place}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
