import * as React from "react"
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "@phosphor-icons/react/ssr"
import { cn } from "cn"

/**
 * Stats (11, 23): KPI tiles. Each tile prints a mono index + label, one huge light numeral
 * (tabular) with an optional unit, a delta that always says the direction in words next to
 * its arrow, and a ruled footnote. Every `Stat` is its own `rounded-lg border bg-card` tile;
 * `StatGrid` sets them apart with `gap-3` and aligns label/value/delta/footnote rows across
 * tiles with subgrid, so a wrapped label or a missing delta never staggers the numerals.
 */

const statGridColumns = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
} as const

function StatGrid({
  columns,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { columns?: keyof typeof statGridColumns }) {
  // Without an explicit column count, one row holds every stat (up to four).
  const count = Math.min(4, Math.max(1, React.Children.count(children))) as keyof typeof statGridColumns
  return (
    <div
      data-slot="stat-grid"
      className={cn(
        "grid gap-3 *:data-[slot=stat]:row-span-4 *:data-[slot=stat]:grid-rows-subgrid",
        statGridColumns[columns ?? count],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type StatProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Mono index printed before the label, e.g. "01". */
  index?: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
  /** Unit or denominator set beside the numeral, e.g. "%" or "/ 93". */
  unit?: React.ReactNode
  /** Usually a `StatDelta`. */
  delta?: React.ReactNode
  footnote?: React.ReactNode
}

function Stat({ index, label, value, unit, delta, footnote, className, ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "grid min-w-0 grid-rows-[auto_auto_auto_auto] gap-3 rounded-lg border bg-card p-4",
        className
      )}
      {...props}
    >
      <div
        data-slot="stat-label"
        className="flex items-baseline gap-2 font-mono text-2xs tracking-label text-muted-foreground uppercase"
      >
        {index != null ? <span className="tabular-nums text-foreground">{index}</span> : null}
        <span className="min-w-0">{label}</span>
      </div>
      <div data-slot="stat-value" className="flex items-baseline gap-1.5">
        <span className="text-5xl leading-none font-light tracking-tight tabular-nums">
          {value}
        </span>
        {unit != null ? (
          <span className="font-mono text-xs tracking-label text-muted-foreground uppercase tabular-nums">
            {unit}
          </span>
        ) : null}
      </div>
      {/* Slots always render so rows line up across a StatGrid (subgrid). */}
      <div data-slot="stat-delta-slot">{delta}</div>
      <div data-slot="stat-footnote-slot">
        {footnote != null ? (
          <p data-slot="stat-footnote" className="border-t pt-2 text-xs text-muted-foreground">
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  )
}

type StatDeltaDirection = "up" | "down" | "flat"

const deltaWords: Record<StatDeltaDirection, string> = { up: "Up", down: "Down", flat: "No change" }
const deltaIcons = { up: ArrowUpIcon, down: ArrowDownIcon, flat: ArrowRightIcon }
const deltaTones = {
  positive: "text-positive",
  destructive: "text-destructive",
  neutral: "text-muted-foreground",
}

/**
 * The change since the last period. Tone is independent of direction (more open findings
 * is "up" and bad), so pass `tone`; the word ("Up", "Down") keeps it readable without colour.
 */
function StatDelta({
  direction,
  tone = "neutral",
  word,
  className,
  children,
  ...props
}: React.ComponentProps<"p"> & {
  direction: StatDeltaDirection
  tone?: keyof typeof deltaTones
  /** Overrides the default direction word. */
  word?: React.ReactNode
}) {
  const Icon = deltaIcons[direction]
  return (
    <p
      data-slot="stat-delta"
      data-direction={direction}
      data-tone={tone}
      className={cn("flex items-center gap-1 text-xs tabular-nums", deltaTones[tone], className)}
      {...props}
    >
      <Icon aria-hidden="true" weight="bold" className="size-3 shrink-0" />
      <span className="font-medium">{word ?? deltaWords[direction]}</span>
      {children != null ? <span>{children}</span> : null}
    </p>
  )
}

export { Stat, StatDelta, StatGrid }
export type { StatProps }
