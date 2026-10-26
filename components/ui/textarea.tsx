import * as React from "react"
import { cn } from "cn"

/**
 * Textareas share the input recipe: a ruled field on a sheet, blue focus rule, red when invalid.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-2 text-sm leading-relaxed text-foreground transition-[border-color,outline-color] duration-150 ease-snap outline-none placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:outline-destructive max-sm:text-base",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
