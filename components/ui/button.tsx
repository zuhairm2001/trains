import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Buttons are keys: ink for the one committing action, putty for the rest (02, 08).
 * Labels are mono, uppercase and short — a verb and an object ("Save control").
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-mono text-xs font-medium tracking-label whitespace-nowrap uppercase transition-[background-color,border-color,color,box-shadow,translate] duration-150 ease-snap outline-none select-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/88 active:translate-y-px",
        key: "border-putty-edge bg-secondary text-secondary-foreground shadow-key hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] active:translate-y-px active:shadow-key-pressed aria-expanded:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] active:translate-y-px aria-expanded:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]",
        outline:
          "border-input bg-card text-foreground hover:border-foreground hover:bg-muted active:translate-y-px aria-expanded:border-foreground aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/88 focus-visible:outline-destructive active:translate-y-px",
        link: "h-auto! px-0! font-sans text-sm tracking-normal text-info normal-case underline decoration-1 underline-offset-4 hover:decoration-2",
        bracket:
          "h-auto! rounded-sm px-0! text-foreground before:text-muted-foreground before:content-['['] after:text-muted-foreground after:content-[']'] hover:bg-mark hover:text-mark-foreground",
      },
      size: {
        default:
          "h-8 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 pointer-coarse:h-10",
        xs: "h-6 gap-1.5 px-2 text-2xs [&_svg:not([class*='size-'])]:size-3 pointer-coarse:h-9",
        sm: "h-7 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:h-10",
        lg: "h-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8 pointer-coarse:size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3 pointer-coarse:size-9",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5 pointer-coarse:size-10",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
