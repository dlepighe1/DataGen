import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../Utils";

export const Tabs = TabsPrimitive.Root;

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {any} props.rest
 */
export function TabsList({ className, ...rest }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-[hsl(var(--secondary))] p-1 text-[hsl(var(--muted-foreground))]",
        className
      )}
      {...rest}
    />
  );
}

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {any} props.rest
 */
export function TabsTrigger({ className, ...rest }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-[hsl(var(--foreground))] data-[state=active]:shadow-sm",
        className
      )}
      {...rest}
    />
  );
}

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {any} props.rest
 */
export function TabsContent({ className, ...rest }) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...rest}
    />
  );
}
