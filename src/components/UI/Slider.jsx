import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../Utils";

export function Slider({ className, ...rest }) {
  return (
    <SliderPrimitive.Root
      className={cn("dg-slider-root", className)}
      {...rest}
    >
      <SliderPrimitive.Track className="dg-slider-track">
        <SliderPrimitive.Range className="dg-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="dg-slider-thumb" />
    </SliderPrimitive.Root>
  );
}
