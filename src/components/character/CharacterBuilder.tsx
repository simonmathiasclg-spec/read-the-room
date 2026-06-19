"use client";

import {
  ACCESSORIES,
  ACCESSORY_LABELS,
  ANIMALS,
  COLORS,
  type Character,
} from "@/lib/character";
import { Critter } from "./Critter";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

function Opt({
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
        "rounded-2xl p-1 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
        selected
          ? "bg-psc-red/10 ring-2 ring-psc-red"
          : "ring-1 ring-black/10 hover:ring-psc-black/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Pick a critter, recolor it, add one accessory — 3 taps. */
export function CharacterBuilder({
  character,
  onChange,
}: {
  character: Character;
  onChange: (next: Character) => void;
}) {
  const set = (patch: Partial<Character>) => onChange({ ...character, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Critter character={character} size={84} />
        <div className="text-left">
          <p className="font-display text-lg font-extrabold">Your critter</p>
          <p className="text-sm text-psc-gray-2">
            Pick a critter, color &amp; accessory.
          </p>
        </div>
      </div>

      <Row label="Critter">
        {ANIMALS.map((a) => (
          <Opt
            key={a}
            label={a}
            selected={character.animal === a}
            onClick={() => set({ animal: a })}
          >
            <Critter
              character={{ ...character, animal: a, accessory: "none" }}
              size={42}
              ring={false}
            />
          </Opt>
        ))}
      </Row>

      <Row label="Color">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.id}
            aria-pressed={character.color === c.id}
            onClick={() => set({ color: c.id })}
            style={{ backgroundColor: c.base }}
            className={[
              "size-11 rounded-full transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
              character.color === c.id
                ? "ring-2 ring-psc-black ring-offset-2"
                : "ring-1 ring-black/10",
            ].join(" ")}
          />
        ))}
      </Row>

      <Row label="Accessory">
        {ACCESSORIES.map((a) => (
          <Opt
            key={a}
            label={ACCESSORY_LABELS[a]}
            selected={character.accessory === a}
            onClick={() => set({ accessory: a })}
          >
            <div className="flex flex-col items-center">
              <Critter
                character={{ ...character, accessory: a }}
                size={42}
                ring={false}
              />
              <span className="pb-0.5 text-[11px] font-bold text-psc-gray-2">
                {ACCESSORY_LABELS[a]}
              </span>
            </div>
          </Opt>
        ))}
      </Row>
    </div>
  );
}
