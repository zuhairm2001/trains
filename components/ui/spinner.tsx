import { cn } from "cn"

const SEGMENTS = 8

/**
 * A segment spinner: eight small dots stepping round like an LCD busy indicator (09), not a
 * glossy ring. It holds still under reduced motion. Pair with words where space allows.
 */
function Spinner({
  className,
  "aria-label": ariaLabel = "Loading",
  ...props
}: React.ComponentProps<"svg">) {
  const decorative = props["aria-hidden"] === true || props["aria-hidden"] === "true"
  return (
    <svg
      data-slot="spinner"
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : ariaLabel}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn(
        "size-4 shrink-0 animate-spin [animation-duration:900ms] [animation-timing-function:steps(8,end)] motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <rect
          key={index}
          x="7"
          y="0.5"
          width="2"
          height="4"
          rx="1"
          opacity={(index + 1) / SEGMENTS}
          transform={`rotate(${index * (360 / SEGMENTS)} 8 8)`}
        />
      ))}
    </svg>
  )
}

/** Spinner with a mono status line, e.g. "Generating SoA…". The text is the accessible name. */
function SpinnerText({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="spinner-text"
      role="status"
      className={cn(
        "inline-flex items-center gap-2 font-mono text-2xs tracking-label text-muted-foreground uppercase [&_[data-slot=spinner]]:size-3.5",
        className
      )}
      {...props}
    >
      <Spinner aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}

export { Spinner, SpinnerText }
