import React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";
import { cn } from "../Utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {any} props.children
 * @param {any} props.rest
 */
export function Label({ className, children, ...rest }) {
  return (
    <LabelPrimitive.Root
      className={cn(labelVariants(), className)}
      {...rest}
    >
      {children}
    </LabelPrimitive.Root>
  );
}
