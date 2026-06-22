import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-primary-600 hover:bg-primary-700 text-white shadow-sm disabled:bg-primary-300",
    secondary:
      "bg-accent-500 hover:bg-accent-600 text-white shadow-sm disabled:bg-accent-300",
    danger:
      "bg-danger hover:bg-red-600 text-white shadow-sm disabled:bg-red-300",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    outline:
      "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all hover:shadow-md disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
