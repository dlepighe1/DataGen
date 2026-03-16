import React from "react";
import { cn } from "../Utils";

export function Input({ className, type = "text", ...rest }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg px-3 py-2 text-sm",
        "bg-[rgba(10,18,40,0.75)] text-slate-100 placeholder:text-slate-500",
        "border border-slate-600/70",
        "outline-none ring-0",
        "transition-all duration-200",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
        "hover:border-slate-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...rest}
    />
  );
}
