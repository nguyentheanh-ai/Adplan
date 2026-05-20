import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ai" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5",
  ai: "ai-gradient-bg text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5",
  secondary: "bg-white text-on-surface border border-outline-variant hover:bg-surface-container-low",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary",
  danger: "bg-error text-white shadow-lg hover:-translate-y-0.5"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
