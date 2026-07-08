"use client";

import {
  ACCESSORIES,
  ACCESSORY_LABELS,
  PROFILES,
  type Character,
} from "@/lib/character";
import { ProfileAvatar } from "./ProfileAvatar";

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

/** Pick one of the 17 PI profiles, then add a goofy accessory. */
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
        <ProfileAvatar character={character} size={76} anim="idle" />
        <div className="text-left">
          <p className="font-display text-lg font-extrabold">{character.profile}</p>
          <p className="text-sm text-psc-gray-2">
            Pick your PI profile &amp; an accessory.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
          Profile
        </p>
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set({ profile: p })}
              aria-pressed={character.profile === p}
              aria-label={p}
              className={[
                "flex flex-col items-center gap-1 rounded-2xl p-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-psc-red/40",
                character.profile === p
                  ? "bg-psc-red/10 ring-2 ring-psc-red"
                  : "ring-1 ring-black/10 hover:ring-psc-black/40",
              ].join(" ")}
            >
              <ProfileAvatar
                character={{ profile: p, accessory: "none" }}
                size={44}
                ring={false}
              />
              <span className="text-[11px] font-bold leading-tight text-psc-gray-2">
                {p}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
          Accessory
        </p>
        <div className="flex flex-wrap gap-2.5">
          {ACCESSORIES.map((a) => (
            <Opt
              key={a}
              label={ACCESSORY_LABELS[a]}
              selected={character.accessory === a}
              onClick={() => set({ accessory: a })}
            >
              <div className="flex flex-col items-center">
                <ProfileAvatar
                  character={{ ...character, accessory: a }}
                  size={44}
                  ring={false}
                />
                <span className="pb-0.5 text-[11px] font-bold text-psc-gray-2">
                  {ACCESSORY_LABELS[a]}
                </span>
              </div>
            </Opt>
          ))}
        </div>
      </div>
    </div>
  );
}
