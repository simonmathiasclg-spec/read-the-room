"use client";

import { useEffect, useRef, useState } from "react";
import { getMusicEngine } from "@/lib/hostMusic";

/**
 * Host-only music toggle. Renders a fixed pill on the host screen (never on the
 * player route). Starts OFF — the host clicks it to begin, which both respects
 * browser autoplay rules and gives the AudioContext its required user gesture.
 */
export function HostMusic() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      getMusicEngine()?.stop();
    };
  }, []);

  const toggle = async () => {
    if (busy) return;
    const engine = getMusicEngine();
    if (!engine) return;
    setBusy(true);
    try {
      if (on) {
        engine.stop();
        if (mounted.current) setOn(false);
      } else {
        await engine.start();
        if (mounted.current) setOn(true);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn music off" : "Turn music on"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2.5 font-display text-sm font-bold text-psc-ink shadow-lg ring-1 ring-black/10 backdrop-blur transition hover:bg-white active:scale-95"
    >
      {on ? (
        <span className="flex h-4 items-end gap-[3px]" aria-hidden>
          <i className="w-[3px] rounded-full bg-psc-red music-eq-bar" style={{ height: "100%", animationDelay: "0ms" }} />
          <i className="w-[3px] rounded-full bg-psc-red music-eq-bar" style={{ height: "100%", animationDelay: "160ms" }} />
          <i className="w-[3px] rounded-full bg-psc-red music-eq-bar" style={{ height: "100%", animationDelay: "320ms" }} />
        </span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-psc-ink/50">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
          <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      <span>{on ? "Music on" : "Music off"}</span>
    </button>
  );
}
