import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "../Utils";

/**
 * On-brand numeric input with custom increment/decrement controls.
 * Replaces the browser's native (off-theme) number spinners.
 *
 * Props:
 *  - value:       number | "" (controlled)
 *  - onChange:    (next: number | "") => void
 *  - min, max:    optional bounds (clamped on step and on blur)
 *  - step:        increment size (default 1)
 *  - allowEmpty:  keep "" instead of snapping to min (used by optional Seed)
 *  - placeholder, id, className
 */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  allowEmpty = false,
  placeholder,
  id,
  className,
  ...rest
}) {
  const hasMin = typeof min === "number";
  const hasMax = typeof max === "number";

  const clamp = (n) => {
    if (hasMin) n = Math.max(min, n);
    if (hasMax) n = Math.min(max, n);
    return n;
  };

  const base = () => {
    if (value === "" || value == null || Number.isNaN(Number(value))) {
      return hasMin ? min : 0;
    }
    return Number(value);
  };

  const stepBy = (dir) => {
    onChange(clamp(base() + dir * step));
  };

  const atMax = hasMax && value !== "" && Number(value) >= max;
  const atMin = hasMin && value !== "" && Number(value) <= min;

  const handleInput = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange("");
      return;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(n);
  };

  const handleBlur = () => {
    if (value === "" || value == null) {
      if (!allowEmpty) onChange(hasMin ? min : 0);
      return;
    }
    onChange(clamp(Number(value)));
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); stepBy(1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); stepBy(-1); }
  };

  return (
    <div
      className={cn(
        "group relative flex items-stretch h-10 w-full rounded-lg overflow-hidden",
        "bg-[rgba(10,18,40,0.75)] border border-slate-600/70",
        "transition-all duration-200",
        "hover:border-slate-500",
        "focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20",
        className
      )}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={cn(
          "dg-stepper-input flex-1 min-w-0 bg-transparent px-3 py-2 text-sm",
          "text-slate-100 placeholder:text-slate-500 outline-none"
        )}
        {...rest}
      />
      <div className="flex flex-col flex-shrink-0 w-7 border-l border-slate-600/60">
        <StepButton dir="up" onClick={() => stepBy(1)} disabled={atMax} />
        <span className="h-px w-full bg-slate-600/60" aria-hidden />
        <StepButton dir="down" onClick={() => stepBy(-1)} disabled={atMin} />
      </div>
    </div>
  );
}

function StepButton({ dir, onClick, disabled }) {
  const Icon = dir === "up" ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Increment" : "Decrement"}
      className={cn(
        "flex-1 flex items-center justify-center",
        "text-slate-400 transition-colors duration-150",
        "hover:text-sky-300 hover:bg-sky-500/15 active:bg-sky-500/25",
        "disabled:text-slate-700 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
    </button>
  );
}
