"use client";

/**
 * A labeled row of mutually-exclusive option pills (e.g. 5 / 10 / 15 / 20).
 * Generic over the option value type.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderOption,
  name,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  renderOption?: (option: T) => React.ReactNode;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.18em] text-psc-gray-2">
        {label}
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2.5"
      >
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={() => onChange(opt)}
              className={[
                "min-w-[3.5rem] rounded-xl px-5 py-3 text-lg font-display font-extrabold transition-all duration-100",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-psc-red/40",
                selected
                  ? "bg-psc-black text-white shadow-[0_4px_0_#000]"
                  : "bg-white text-psc-gray-2 ring-1 ring-black/10 hover:ring-psc-black/40 hover:text-psc-black",
              ].join(" ")}
            >
              {renderOption ? renderOption(opt) : opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
