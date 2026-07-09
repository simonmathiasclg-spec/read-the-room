"use client";

import { useState } from "react";
import {
  BODY_COLORS,
  HATS,
  HAT_LABELS,
  OUTFITS,
  OUTFIT_LABELS,
  PROFILES,
  bodyColorOf,
  defaultColorKey,
  type Character,
} from "@/lib/character";
import { Avatar } from "./Avatar";

type TabKey = "profile" | "color" | "outfit" | "hat";
const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "color", label: "Color" },
  { key: "outfit", label: "Outfit" },
  { key: "hat", label: "Hat" },
];

function Tile({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={[
        "flex flex-col items-center gap-1 rounded-2xl p-2 transition-all duration-100 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
        selected
          ? "bg-psc-red/10 ring-2 ring-psc-red"
          : "ring-1 ring-black/10 hover:ring-psc-black/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/**
 * The avatar builder. Pick a PI profile (the head, always intact) and customize
 * the body: color, outfit, and hat. `variant` supplies the auto-distinct
 * default color in the live preview.
 */
export function CharacterBuilder({
  character,
  onChange,
  variant = 0,
}: {
  character: Character;
  onChange: (next: Character) => void;
  variant?: number;
}) {
  // Players pick their reference profile first, then customise from there.
  const [tab, setTab] = useState<TabKey>("profile");
  const set = (patch: Partial<Character>) =>
    onChange({ ...character, ...patch });

  const randomize = () => {
    const pick = <T,>(a: readonly T[]) =>
      a[Math.floor(Math.random() * a.length)];
    set({
      profile: pick(PROFILES),
      bodyColor: pick(BODY_COLORS).key,
      outfit: pick(OUTFITS),
      hat: pick(HATS),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Stage: the live avatar, spotlit ---- */}
      <div
        className="relative flex flex-col items-center overflow-hidden rounded-3xl px-4 pb-4 pt-5"
        style={{
          background:
            "radial-gradient(120% 82% at 50% 4%, rgba(245,168,0,0.16), rgba(237,28,36,0.06) 46%, #ffffff 78%)",
        }}
      >
        <button
          type="button"
          onClick={randomize}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-sm font-extrabold text-psc-black shadow-sm ring-1 ring-black/10 transition-transform active:scale-95"
        >
          <span aria-hidden>🎲</span> Random
        </button>
        <Avatar character={character} variant={variant} size={140} anim="idle" />
        <p className="mt-1 font-display text-xl font-black">{character.profile}</p>
        <p className="text-sm font-medium text-psc-gray-2">Make it yours</p>
      </div>

      {/* ---- Section tabs ---- */}
      <div className="flex gap-1.5" role="tablist" aria-label="Customize">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={[
                "flex-1 rounded-xl px-2 py-2.5 font-display text-sm font-extrabold transition-all duration-100 sm:text-base",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
                active
                  ? "bg-psc-black text-white shadow-[0_3px_0_#000]"
                  : "bg-white text-psc-gray-2 ring-1 ring-black/10 hover:text-psc-black hover:ring-psc-black/40",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ---- Panels ---- */}
      {tab === "profile" && (
        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {PROFILES.map((p) => (
            <Tile
              key={p}
              label={p}
              selected={character.profile === p}
              onClick={() => set({ profile: p })}
            >
              <Avatar character={{ ...character, profile: p }} variant={variant} size={54} />
              <span className="text-[11px] font-bold leading-tight text-psc-gray-2">
                {p}
              </span>
            </Tile>
          ))}
        </div>
      )}

      {tab === "color" && (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
          <Tile
            label="Auto color"
            selected={character.bodyColor === "auto"}
            onClick={() => set({ bodyColor: "auto" })}
          >
            <Swatch color={bodyColorOf(defaultColorKey(character.profile, variant)).base} auto />
            <span className="text-[11px] font-bold text-psc-gray-2">Auto</span>
          </Tile>
          {BODY_COLORS.map((col) => (
            <Tile
              key={col.key}
              label={col.name}
              selected={character.bodyColor === col.key}
              onClick={() => set({ bodyColor: col.key })}
            >
              <Swatch color={col.base} />
              <span className="text-[11px] font-bold text-psc-gray-2">{col.name}</span>
            </Tile>
          ))}
        </div>
      )}

      {tab === "outfit" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {OUTFITS.map((o) => (
            <Tile
              key={o}
              label={OUTFIT_LABELS[o]}
              selected={character.outfit === o}
              onClick={() => set({ outfit: o })}
            >
              <Avatar character={{ ...character, outfit: o }} variant={variant} size={58} />
              <span className="text-[11px] font-bold text-psc-gray-2">
                {OUTFIT_LABELS[o]}
              </span>
            </Tile>
          ))}
        </div>
      )}

      {tab === "hat" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {HATS.map((h) => (
            <Tile
              key={h}
              label={HAT_LABELS[h]}
              selected={character.hat === h}
              onClick={() => set({ hat: h })}
            >
              <Avatar character={{ ...character, hat: h }} variant={variant} size={58} />
              <span className="text-[11px] font-bold text-psc-gray-2">
                {HAT_LABELS[h]}
              </span>
            </Tile>
          ))}
        </div>
      )}
    </div>
  );
}

function Swatch({ color, auto = false }: { color: string; auto?: boolean }) {
  return (
    <span
      className="relative block size-9 rounded-full ring-1 ring-black/10"
      style={{ background: color }}
    >
      {auto && (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-sm font-black text-white drop-shadow"
        >
          ↻
        </span>
      )}
    </span>
  );
}
