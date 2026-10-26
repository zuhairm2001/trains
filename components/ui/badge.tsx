import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Badges are stamps and labels (01, 18, 25): mono, uppercase, softly cut, one signal at a time.
 * Status must never rely on colour alone — keep the word ("Overdue", "Verified").
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-1.5 font-mono text-2xs font-medium tracking-label whitespace-nowrap uppercase transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-foreground bg-transparent text-foreground [a]:hover:bg-muted",
        solid: "border-foreground bg-foreground text-background [a]:hover:bg-foreground/85",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        outline: "border-border bg-transparent text-muted-foreground [a]:hover:text-foreground",
        mark: "border-transparent bg-mark text-mark-foreground",
        positive: "border-positive/50 bg-positive-wash text-positive",
        caution: "border-caution/50 bg-caution-wash text-caution",
        destructive: "border-destructive/50 bg-destructive-wash text-destructive",
        info: "border-info/50 bg-info-wash text-info",
        ghost: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "border-transparent px-0 text-info underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
