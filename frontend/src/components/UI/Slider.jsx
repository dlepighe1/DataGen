import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../Utils";

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {any} props.rest
 */
export function Slider({ className, ...rest }) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...rest}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
        <SliderPrimitive.Range className="absolute h-full bg-[hsl(var(--primary))]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-[hsl(var(--background))] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}
