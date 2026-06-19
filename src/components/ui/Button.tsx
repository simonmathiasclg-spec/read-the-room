import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "gold" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-2xl font-display font-extrabold tracking-tight text-center leading-none select-none " +
  "transition-[transform,box-shadow,background-color] duration-100 ease-out " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0";

const sizes: Record<ButtonSize, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-4 text-lg",
  lg: "px-9 py-5 text-xl sm:text-2xl",
};

// Each variant carries its own colored "3D" bottom edge that compresses on press.
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-psc-red text-white ring-psc-red/40 shadow-[0_6px_0_var(--psc-red-deep)] " +
    "hover:bg-[#ff2730] active:translate-y-[4px] active:shadow-[0_2px_0_var(--psc-red-deep)]",
  gold:
    "bg-psc-gold text-psc-black ring-psc-gold/50 shadow-[0_6px_0_var(--psc-gold-deep)] " +
    "hover:brightness-[1.06] active:translate-y-[4px] active:shadow-[0_2px_0_var(--psc-gold-deep)]",
  outline:
    "bg-white text-psc-black border-2 border-psc-black ring-psc-black/30 shadow-[0_6px_0_var(--psc-black)] " +
    "hover:bg-psc-black hover:text-white active:translate-y-[4px] active:shadow-[0_2px_0_var(--psc-black)]",
  ghost:
    "bg-transparent text-psc-gray-2 ring-psc-gray-1/50 hover:text-psc-black",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

function cx(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  className?: string,
) {
  return [
    base,
    sizes[size],
    variants[variant],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-5 animate-spin rounded-full border-[3px] border-current border-t-transparent opacity-80"
    />
  );
}

/** Link-styled-as-button. Use for navigation. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={cx(variant, size, fullWidth, className)}>
      {children}
    </Link>
  );
}

/** Action button. Supports a loading state that locks interaction. */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className={cx(variant, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
