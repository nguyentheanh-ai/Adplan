import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-36 w-full resize-none rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
