import { cn } from "cn"

/**
 * Skeletons are unprinted blocks: a wash with a faint halftone (04). They pulse gently and
 * hold still when the reader prefers reduced motion. No shimmer gradients.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative animate-pulse overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:pattern-dots before:text-foreground/10 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
