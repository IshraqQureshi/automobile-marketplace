import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand",
        error ? "border-red-400" : "border-neutral-300",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
