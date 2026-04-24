import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { MealfloIcon, type IconName } from "@/components/mealflo/icon";
import { cn } from "@/lib/utils";

type FieldProps = {
  children: ReactNode;
  className?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
};

export function Field({
  children,
  className,
  hint,
  htmlFor,
  label,
  required = false,
}: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={cn("grid gap-2", className)}>
      <span className="text-ink flex items-center gap-2 text-sm font-medium">
        <span>{label}</span>
        {required ? (
          <span className="text-muted text-[13px] font-medium">Required</span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="text-muted text-sm leading-6">{hint}</span>
      ) : null}
    </label>
  );
}

type BaseInputProps = {
  className?: string;
  leadingIcon?: IconName;
};

const baseFieldClasses =
  "min-h-[52px] w-full rounded-[12px] border-[1.5px] border-line bg-white px-4 text-base text-[var(--mf-color-ink)] transition-[transform,border-color,background-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] placeholder:text-subtle hover:border-line-strong focus:border-[rgba(120,144,250,0.45)] focus:bg-white";

export function Input({
  className,
  leadingIcon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & BaseInputProps) {
  if (!leadingIcon) {
    return <input className={cn(baseFieldClasses, className)} {...props} />;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-[52px] shrink-0 items-center justify-center">
        <MealfloIcon
          name={leadingIcon}
          size={30}
          className="pointer-events-none"
        />
      </span>
      <input className={cn(baseFieldClasses, className)} {...props} />
    </div>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        baseFieldClasses,
        "min-h-[148px] px-4 py-3 leading-6",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(baseFieldClasses, "pr-12", className)} {...props}>
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 h-2.5 w-2.5 -translate-y-[60%] rotate-45 border-r-2 border-b-2 border-[rgba(24,24,60,0.42)]"
      />
    </div>
  );
}

type ChoiceChipProps = {
  children: ReactNode;
  className?: string;
  selected?: boolean;
};

export function ChoiceChip({
  children,
  className,
  selected = false,
}: ChoiceChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[48px] items-center justify-center rounded-full border-[1.5px] px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]",
        selected
          ? "text-info-text border-[rgba(120,144,250,0.35)] bg-[var(--mf-color-blue-50)]"
          : "border-line text-ink bg-white",
        className
      )}
    >
      {children}
    </span>
  );
}
