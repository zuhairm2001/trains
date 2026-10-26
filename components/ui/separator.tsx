"use client"

import * as React from "react"
import { cn } from "cn"
import { Separator as SeparatorPrimitive } from "radix-ui"

/**
 * A 1px rule (20). Horizontal rules may carry a mono label set into the line, like a
 * section mark on a ledger page.
 */
function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  label,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  /** Horizontal only: mono caption set into the rule. */
  label?: React.ReactNode
}) {
  if (label && orientation === "horizontal") {
    return (
      <SeparatorPrimitive.Root
        data-slot="separator"
        data-labelled=""
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "flex w-full shrink-0 items-center gap-3 font-mono text-2xs tracking-label text-muted-foreground uppercase before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border",
          className
        )}
        {...props}
      >
        <span data-slot="separator-label" className="shrink-0">
          {label}
        </span>
      </SeparatorPrimitive.Root>
    )
  }

  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
