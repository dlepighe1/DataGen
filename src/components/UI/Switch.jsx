import React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "../Utils";

export function Switch({ className, ...rest }) {
  return (
    <SwitchPrimitives.Root
      className={cn("dg-switch-root", className)}
      {...rest}
    >
      <SwitchPrimitives.Thumb className="dg-switch-thumb" />
    </SwitchPrimitives.Root>
  );
}
