"use client";

import { MotionConfig } from "framer-motion";

/**
 * Makes every framer-motion animation honor the user's prefers-reduced-motion
 * setting (movement/scale/rotate are disabled, opacity fades are kept).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
