import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../Utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...rest }) {
  return (
    <TabsPrimitive.List
      className={cn("dg-tabs-list", className)}
      {...rest}
    />
  );
}

export function TabsTrigger({ className, ...rest }) {
  return (
    <TabsPrimitive.Trigger
      className={cn("dg-tab-trigger", className)}
      {...rest}
    />
  );
}

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
