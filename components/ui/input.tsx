import * as React from "react"
import { cn } from "cn"

/**
 * Inputs are ruled fields on a sheet (20, 24): the boundary meets 3:1 contrast, focus draws
 * a signal-blue rule over it, and invalid state turns the rule red with a message below.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 text-sm text-foreground transition-[border-color,outline-color] duration-150 ease-snap outline-none placeholder:text-ink-3 file:mr-3 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-mono file:text-2xs file:tracking-label file:text-foreground file:uppercase focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:outline-destructive max-sm:text-base pointer-coarse:h-10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
