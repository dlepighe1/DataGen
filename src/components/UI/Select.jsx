import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../Utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...rest }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
        "bg-[rgba(10,18,40,0.75)] text-slate-100",
        "border border-slate-600/70",
        "outline-none ring-0",
        "transition-all duration-200",
        "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
        "hover:border-slate-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "[&>span]:line-clamp-1",
        className
      )}
      {...rest}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({ className, ...rest }) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("flex cursor-default items-center justify-center py-1 text-slate-400", className)}
      {...rest}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}
export { SelectScrollUpButton };

function SelectScrollDownButton({ className, ...rest }) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("flex cursor-default items-center justify-center py-1 text-slate-400", className)}
      {...rest}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}
export { SelectScrollDownButton };

export function SelectContent({ className, children, position = "popper", ...rest }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl",
          "bg-[rgba(10,18,40,0.97)] text-slate-200",
          "border border-slate-700/80",
          "shadow-2xl shadow-black/60",
          "backdrop-filter backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...rest}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...rest }) {
  return (
    <SelectPrimitive.Label
      className={cn("py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-500 uppercase tracking-wider", className)}
      {...rest}
    />
  );
}

export function SelectItem({ className, children, ...rest }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none",
        "text-slate-200",
        "transition-colors duration-150",
        "focus:bg-sky-500/20 focus:text-sky-100",
        "hover:bg-sky-500/15",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className
      )}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-sky-400" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...rest }) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-slate-700/60", className)}
      {...rest}
    />
  );
}
