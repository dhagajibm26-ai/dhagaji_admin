import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#1b4332] text-white hover:bg-[#11271d] active:scale-[0.98] shadow-sm hover:shadow-md focus-visible:ring-[#1b4332]",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-700 active:scale-[0.98] shadow-sm focus-visible:ring-slate-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] shadow-sm focus-visible:ring-red-600",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400",
  outline:
    "border border-[#1b4332] text-[#1b4332] bg-transparent hover:bg-[#1b4332] hover:text-white active:scale-[0.98] focus-visible:ring-[#1b4332]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold tracking-wide transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
