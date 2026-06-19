import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  /** "light" = white surface (default); "stage" = translucent panel on the dark host screen. */
  tone?: "light" | "stage";
};

export function Card({ children, className, tone = "light" }: CardProps) {
  const toneClass =
    tone === "stage"
      ? "border-white/10 bg-white/[0.04] backdrop-blur-sm"
      : "border-black/5 bg-white shadow-[0_2px_24px_rgba(17,17,17,0.07)]";
  return (
    <div
      className={[
        "rounded-3xl border p-5 sm:p-6",
        toneClass,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
