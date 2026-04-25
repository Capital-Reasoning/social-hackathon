import type {
  ButtonHTMLAttributes,
  ComponentProps,
  CSSProperties,
  ReactNode,
} from "react";

import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "warm"
  | "ghost"
  | "quiet"
  | "danger";
type ButtonSize = "sm" | "md" | "lg";

type VariantProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

const baseClasses =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border-[1.5px] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,opacity] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)] disabled:pointer-events-none disabled:opacity-55 active:scale-[0.97]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-action bg-action text-[var(--mf-color-on-action)] hover:-translate-y-0.5 hover:border-action-strong hover:bg-action-strong hover:text-[var(--mf-color-on-action)]",
  secondary:
    "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-line-strong hover:bg-[rgba(255,255,255,0.88)]",
  warm: "border-[rgba(170,120,0,0.35)] bg-primary text-ink hover:-translate-y-0.5 hover:border-[rgba(170,120,0,0.5)] hover:bg-[#f7ce42]",
  ghost:
    "border-transparent bg-transparent text-ink hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.72)]",
  quiet:
    "border-[rgba(24,24,60,0.08)] bg-[rgba(255,255,255,0.72)] text-muted hover:-translate-y-0.5 hover:border-line hover:bg-white hover:text-ink",
  danger:
    "border-[rgba(224,80,80,0.24)] bg-[var(--mf-color-red-50)] text-error-text hover:-translate-y-0.5 hover:border-[rgba(224,80,80,0.4)] hover:bg-[rgba(255,240,240,0.92)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-[52px] px-5 text-base",
};

function buttonTextColor(variant: ButtonVariant = "secondary") {
  if (variant === "primary") {
    return "var(--mf-color-on-action)";
  }

  if (variant === "danger") {
    return "var(--mf-color-error-text)";
  }

  if (variant === "quiet") {
    return "var(--mf-color-muted)";
  }

  return "var(--mf-color-ink)";
}

export function buttonClasses({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  iconOnly = false,
}: Omit<VariantProps, "leading"> = {}) {
  return cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    iconOnly && "aspect-square px-0",
    fullWidth && "w-full"
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps;

export function Button({
  children,
  className,
  fullWidth,
  iconOnly,
  leading,
  size,
  style,
  trailing,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        buttonClasses({ variant, size, fullWidth, iconOnly }),
        className
      )}
      style={{
        color: buttonTextColor(variant),
        ...style,
      }}
      {...props}
    >
      {leading}
      {children ? <span>{children}</span> : null}
      {trailing}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  children?: ReactNode;
  className?: string;
  fullWidth?: boolean;
  iconOnly?: boolean;
  leading?: ReactNode;
  size?: ButtonSize;
  style?: CSSProperties;
  trailing?: ReactNode;
  variant?: ButtonVariant;
};

export function ButtonLink({
  children,
  className,
  fullWidth,
  href,
  iconOnly,
  leading,
  size,
  style,
  trailing,
  variant,
}: ButtonLinkProps) {
  const classes = cn(
    buttonClasses({ variant, size, fullWidth, iconOnly }),
    className
  );
  const isExternal =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        style={{
          color: buttonTextColor(variant),
          ...style,
        }}
      >
        {leading}
        {children ? <span>{children}</span> : null}
        {trailing}
      </a>
    );
  }

  return (
    <Link
      href={href as ComponentProps<typeof Link>["href"]}
      className={classes}
      style={{
        color: buttonTextColor(variant),
        ...style,
      }}
    >
      {leading}
      {children ? <span>{children}</span> : null}
      {trailing}
    </Link>
  );
}
