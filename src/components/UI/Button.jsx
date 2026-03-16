import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../Utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-indigo-400 hover:shadow-sky-500/40",
        destructive:
          "bg-red-600 text-white shadow hover:bg-red-500",
        outline:
          "border-2 border-sky-500/60 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-200",
        secondary:
          "bg-slate-700/80 text-slate-200 hover:bg-slate-600/80 border border-slate-600",
        ghost:
          "hover:bg-slate-700/60 text-slate-300 hover:text-slate-100",
        link:
          "text-sky-400 underline-offset-4 hover:underline hover:text-sky-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, asChild = false, children, ...rest }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...rest}
    >
      {children}
    </Comp>
  );
}
