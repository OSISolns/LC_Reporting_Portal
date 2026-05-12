import * as React from "react"
import { cn } from "../../lib/utils"

// ── Badge ──────────────────────────────────────────────────────────────────
const badgeVariants = {
  default:     "bg-primary/10 text-primary border-primary/20",
  secondary:   "bg-slate-100 text-slate-600 border-slate-200",
  destructive: "bg-rose-50 text-rose-700 border-rose-200",
  success:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning:     "bg-amber-50 text-amber-700 border-amber-200",
  blue:        "bg-blue-50 text-blue-700 border-blue-200",
  outline:     "bg-transparent text-foreground border-border",
}

export function Badge({ className, variant = "default", children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────
const buttonVariants = {
  default:   "bg-[#1b669d] text-white hover:bg-[#155180] shadow-sm shadow-[#1b669d]/20",
  outline:   "border-2 border-slate-200 bg-white text-slate-600 hover:border-[#1b669d] hover:text-[#1b669d]",
  ghost:     "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  danger:    "bg-rose-600 text-white hover:bg-rose-700",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
}

const buttonSizes = {
  default: "h-10 px-5 py-2 text-sm",
  sm:      "h-8 px-3 text-xs",
  lg:      "h-12 px-8 text-sm",
  icon:    "h-10 w-10",
}

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)
Button.displayName = "Button"

// ── Input ──────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#1b669d] focus:bg-white focus:ring-4 focus:ring-[#1b669d]/10 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
Input.displayName = "Input"

// ── Select ─────────────────────────────────────────────────────────────────
export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem] px-4 pr-10 text-sm font-medium text-slate-900 outline-none transition-all focus:border-[#1b669d] focus:bg-white focus:ring-4 focus:ring-[#1b669d]/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = "Select"

// ── Label ──────────────────────────────────────────────────────────────────
export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn("block text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-1.5", className)}
      {...props}
    >
      {children}
    </label>
  )
}

// ── Separator ──────────────────────────────────────────────────────────────
export function Separator({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      className={cn(
        "shrink-0 bg-slate-100",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-100", className)}
      {...props}
    />
  )
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("rounded-2xl border-2 border-slate-100 bg-white shadow-sm shadow-slate-200/40", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-lg font-black tracking-tight text-slate-900", className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-slate-400 font-medium", className)} {...props}>
      {children}
    </p>
  )
}
