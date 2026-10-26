"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

/**
 * Tabs come in three shapes:
 * - `default` — a segmented control: soft segments on a wash track, the active segment is ink
 *   (the standard switcher, products/04).
 * - `line` — underline tabs with a 2px ink bar (Carbon, products/13).
 * - `index` — folder tabs with rounded shoulders; the active tab joins the panel below it
 *   (moodboard 03, 15, 17).
 * Put counts in `TabsCount` so the tab row doubles as a status summary (products/16).
 */
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn("group/tabs flex gap-3 data-[orientation=horizontal]:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-stretch text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default:
          "gap-0.5 rounded-md bg-muted p-0.5 group-data-[orientation=horizontal]/tabs:h-8 group-data-[orientation=vertical]/tabs:w-48",
        line: "gap-5 border-border group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=horizontal]/tabs:w-full group-data-[orientation=horizontal]/tabs:border-b group-data-[orientation=vertical]/tabs:gap-0 group-data-[orientation=vertical]/tabs:border-l",
        index:
          "gap-1 border-foreground pl-3 group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=horizontal]/tabs:w-full group-data-[orientation=horizontal]/tabs:border-b",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex flex-1 items-center justify-center gap-2 font-mono text-xs font-medium tracking-label whitespace-nowrap uppercase transition-colors duration-150 ease-snap outline-none select-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default: soft segments on a wash track, the active segment is ink
        "group-data-[variant=default]/tabs-list:rounded-sm group-data-[variant=default]/tabs-list:px-3 group-data-[variant=default]/tabs-list:hover:bg-background/70 group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:bg-foreground group-data-[variant=default]/tabs-list:data-[state=active]:text-background group-data-[orientation=vertical]/tabs:group-data-[variant=default]/tabs-list:h-7 group-data-[orientation=vertical]/tabs:group-data-[variant=default]/tabs-list:justify-start",
        // line: 2px ink bar under the active tab
        "group-data-[variant=line]/tabs-list:flex-none group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:hover:text-foreground group-data-[variant=line]/tabs-list:data-[state=active]:text-foreground group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:rounded-full group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:-bottom-px group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:h-8 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:justify-start group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:px-3 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:-left-px group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:w-0.5",
        // index: folder tabs with rounded shoulders; the active one joins the panel
        "group-data-[variant=index]/tabs-list:flex-none group-data-[variant=index]/tabs-list:rounded-t-md group-data-[variant=index]/tabs-list:border group-data-[variant=index]/tabs-list:border-b-0 group-data-[variant=index]/tabs-list:bg-muted group-data-[variant=index]/tabs-list:px-4 group-data-[variant=index]/tabs-list:hover:text-foreground group-data-[variant=index]/tabs-list:data-[state=active]:-mb-px group-data-[variant=index]/tabs-list:data-[state=active]:border-foreground group-data-[variant=index]/tabs-list:data-[state=active]:bg-card group-data-[variant=index]/tabs-list:data-[state=active]:pb-px group-data-[variant=index]/tabs-list:data-[state=active]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

/** A boxed, tabular count shown before or after a tab label ("07 Open"). */
function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "inline-flex h-4 min-w-5 items-center justify-center rounded-[4px] border border-current/35 px-1 font-mono text-2xs tabular-nums",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-has-data-[variant=index]/tabs:-mt-3 group-has-data-[variant=index]/tabs:rounded-b-lg group-has-data-[variant=index]/tabs:border group-has-data-[variant=index]/tabs:border-t-0 group-has-data-[variant=index]/tabs:border-foreground group-has-data-[variant=index]/tabs:bg-card group-has-data-[variant=index]/tabs:p-5",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsCount, TabsContent, tabsListVariants }
