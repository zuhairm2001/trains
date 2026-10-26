import * as React from "react"
import { cn } from "cn"

/**
 * Timeline (22): a margin trail for records — mono timestamps in the left margin, a
 * hairline rule with markers, sans title + note on the right. Marker states: `current`
 * (solid ink dot, the step in progress; sets aria-current), `marked` (highlighter dot with
 * an ink ring — new or flagged) and `default` (hollow ring). Round dots by default;
 * `square` gives a small soft-cornered square for document-like events.
 * The timestamp column width is `--timeline-time` (default 6.5rem).
 */

function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="timeline"
      className={cn("group/timeline grid [--timeline-time:6.5rem]", className)}
      {...props}
    />
  )
}

type TimelineItemState = "default" | "current" | "marked"

type TimelineItemProps = Omit<React.ComponentProps<"li">, "title"> & {
  /** Timestamp shown in the margin column. */
  time?: React.ReactNode
  /** Machine-readable date for the `<time>` element. */
  dateTime?: string
  title: React.ReactNode
  description?: React.ReactNode
  state?: TimelineItemState
  marker?: "square" | "dot"
}

const markerStates: Record<TimelineItemState, string> = {
  default: "border-foreground bg-transparent",
  current: "border-foreground bg-foreground",
  marked: "border-foreground bg-mark",
}

function TimelineItem({
  time,
  dateTime,
  title,
  description,
  state = "default",
  marker = "dot",
  className,
  children,
  ...props
}: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      data-state={state}
      aria-current={state === "current" ? "step" : undefined}
      className={cn(
        "group/timeline-item grid grid-cols-[var(--timeline-time)_0.625rem_minmax(0,1fr)] gap-x-3",
        className
      )}
      {...props}
    >
      <div
        data-slot="timeline-time"
        className="pt-0.5 font-mono text-2xs tracking-label text-muted-foreground uppercase tabular-nums"
      >
        {time != null ? <time dateTime={dateTime}>{time}</time> : null}
      </div>
      {/* Rule segments stop short of the marker so hollow markers need no background. */}
      <div aria-hidden="true" className="relative">
        <span className="absolute top-0 left-1/2 h-[5px] w-px -translate-x-1/2 bg-foreground/30 group-first/timeline-item:hidden" />
        <span
          data-slot="timeline-marker"
          className={cn(
            "absolute top-[5px] left-0 size-2.5 border",
            marker === "dot" ? "rounded-full" : "rounded-[2px]",
            markerStates[state]
          )}
        />
        <span className="absolute top-[15px] bottom-0 left-1/2 w-px -translate-x-1/2 bg-foreground/30 group-last/timeline-item:hidden" />
      </div>
      <div
        data-slot="timeline-content"
        className="min-w-0 pb-6 group-last/timeline-item:pb-0"
      >
        <p className="text-sm font-medium">{title}</p>
        {description != null ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </li>
  )
}

export { Timeline, TimelineItem }
export type { TimelineItemProps }
