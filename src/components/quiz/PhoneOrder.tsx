"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Phone "put in order": drag cards into sequence. `items` are in CORRECT order;
 * `initialOrder` is the shuffled arrangement (each value is an original item
 * index). On submit we return the current arrangement, so position p is right
 * when arrangement[p] === p.
 */
export function PhoneOrder({
  prompt,
  items,
  initialOrder,
  onSubmit,
  disabled = false,
}: {
  prompt: string;
  items: string[];
  initialOrder: number[];
  onSubmit: (order: number[]) => void;
  disabled?: boolean;
}) {
  const [arr, setArr] = useState<number[]>(initialOrder);

  return (
    <div className="flex h-full flex-col">
      <p className="px-1 pb-1 text-center font-display text-xl font-extrabold text-white">
        {prompt}
      </p>
      <p className="pb-2 text-center text-sm text-white/45">
        Drag the cards — top = first
      </p>
      <Reorder.Group
        axis="y"
        values={arr}
        onReorder={setArr}
        className="flex flex-1 list-none flex-col justify-center gap-3 py-2"
      >
        {arr.map((origIdx, pos) => (
          <OrderCard
            key={origIdx}
            value={origIdx}
            rank={pos + 1}
            label={items[origIdx]}
            disabled={disabled}
          />
        ))}
      </Reorder.Group>
      <Button
        onClick={() => onSubmit(arr)}
        disabled={disabled}
        size="lg"
        fullWidth
        className="mt-2"
      >
        Lock it in
      </Button>
    </div>
  );
}

function OrderCard({
  value,
  rank,
  label,
  disabled,
}: {
  value: number;
  rank: number;
  label: string;
  disabled: boolean;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.04, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}
      className="flex touch-none items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-white select-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-psc-gold font-display text-lg font-black text-psc-black">
        {rank}
      </span>
      <span className="flex-1 text-left text-base font-semibold leading-snug">
        {label}
      </span>
      <button
        type="button"
        aria-label="Drag to reorder"
        disabled={disabled}
        onPointerDown={(e) => controls.start(e)}
        className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-white/40 active:cursor-grabbing"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>
    </Reorder.Item>
  );
}
