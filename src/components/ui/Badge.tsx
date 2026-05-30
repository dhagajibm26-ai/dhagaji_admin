import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, { wrap: string; dot: string }> = {
  success: { wrap: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  danger:  { wrap: "bg-rose-50 text-rose-700 ring-rose-200",         dot: "bg-rose-500" },
  warning: { wrap: "bg-amber-50 text-amber-700 ring-amber-200",       dot: "bg-amber-500" },
  info:    { wrap: "bg-sky-50 text-sky-700 ring-sky-200",             dot: "bg-sky-500" },
  neutral: { wrap: "bg-slate-100 text-slate-600 ring-slate-200",      dot: "bg-slate-400" },
};

export function Badge({ variant = "neutral", children, className, dot = false }: BadgeProps) {
  const v = variantClasses[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        v.wrap,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />}
      {children}
    </span>
  );
}
