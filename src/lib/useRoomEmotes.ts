"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeEmotes } from "./room";

const ACTIVE_MS = 2800;

/**
 * Active emote per player (playerId → emote key), each auto-clearing ~2.8s after
 * it arrives. Keyed on arrival (not the server timestamp) to dodge clock skew,
 * and ignores whatever's already stored on first load so stale emotes don't
 * replay. Used by the host lobby + podium to show players' emotes.
 */
export function useRoomEmotes(pin: string | null): Record<string, string> {
  const [active, setActive] = useState<Record<string, string>>({});
  const lastAt = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const first = useRef(true);

  useEffect(() => {
    if (!pin) return;
    first.current = true;
    const unsub = subscribeEmotes(pin, (map) => {
      const isFirst = first.current;
      first.current = false;
      for (const [id, e] of Object.entries(map)) {
        if (!e || typeof e.at !== "number") continue;
        if (lastAt.current[id] === e.at) continue;
        lastAt.current[id] = e.at;
        if (isFirst) continue; // don't replay emotes stored before we joined
        setActive((a) => ({ ...a, [id]: e.key }));
        clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
          setActive((a) => {
            const next = { ...a };
            delete next[id];
            return next;
          });
        }, ACTIVE_MS);
      }
    });
    const t = timers.current;
    return () => {
      unsub();
      Object.values(t).forEach(clearTimeout);
    };
  }, [pin]);

  return active;
}
