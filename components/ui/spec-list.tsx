import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Spec list (18, 19, 20, 21): the ledger lines of a record card. A real `dl` — mono 2xs
 * uppercase labels, sans values. Variants: `leader` (label ····· value, for short facts
 * in a narrow column), `ruled` (label column + value on hairline rows) and `grid`
 * (a borderless field grid laid out by spacing; label above value). The ruled label column is
 * `--spec-label` (default 10rem). Items read the variant from the list via `data-variant`,
 * so both parts stay server components.
 */
const specListVariants = cva("group/spec-list min-w-0 text-sm", {
  variants: {
    variant: {
      leader: "grid gap-y-2",
      ruled: "grid border-t",
      grid: "grid gap-x-8 gap-y-3",
    },
    columns: {
      1: "",
      2: "",
      3: "",
      4: "",
    },
  },
  compoundVariants: [
    { variant: "grid", columns: 2, className: "grid-cols-2" },
    { variant: "grid", columns: 3, className: "grid-cols-2 sm:grid-cols-3" },
    { variant: "grid", columns: 4, className: "grid-cols-2 sm:grid-cols-4" },
  ],
  defaultVariants: {
    variant: "ruled",
    columns: 2,
  },
})

function SpecList({
  className,
  variant = "ruled",
  columns = 2,
  ...props
}: React.ComponentProps<"dl"> & VariantProps<typeof specListVariants>) {
  return (
    <dl
      data-slot="spec-list"
      data-variant={variant}
      className={cn(specListVariants({ variant, columns }), className)}
      {...props}
    />
  )
}

type SpecItemProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Short label, rendered as the `dt`. */
  label: React.ReactNode
  /** The value, rendered as the `dd`. */
  children: React.ReactNode
}

function SpecItem({ label, children, className, ...props }: SpecItemProps) {
  return (
    <div
      data-slot="spec-item"
      className={cn(
        "min-w-0",
        "group-data-[variant=leader]/spec-list:flex group-data-[variant=leader]/spec-list:items-baseline group-data-[variant=leader]/spec-list:gap-2",
        "group-data-[variant=ruled]/spec-list:grid group-data-[variant=ruled]/spec-list:grid-cols-[var(--spec-label,10rem)_minmax(0,1fr)] group-data-[variant=ruled]/spec-list:items-baseline group-data-[variant=ruled]/spec-list:gap-4 group-data-[variant=ruled]/spec-list:border-b group-data-[variant=ruled]/spec-list:py-2.5",
        "group-data-[variant=grid]/spec-list:flex group-data-[variant=grid]/spec-list:flex-col group-data-[variant=grid]/spec-list:gap-1",
        className
      )}
      {...props}
    >
      <dt
        data-slot="spec-label"
        className="shrink-0 font-mono text-2xs tracking-label text-muted-foreground uppercase"
      >
        {label}
      </dt>
      <span
        aria-hidden="true"
        data-slot="spec-leader"
        className="hidden min-w-4 flex-1 border-b border-dotted border-foreground/40 group-data-[variant=leader]/spec-list:block"
      />
      <dd
        data-slot="spec-value"
        className="min-w-0 text-sm text-foreground tabular-nums group-data-[variant=leader]/spec-list:text-right"
      >
        {children}
      </dd>
    </div>
  )
}

export { SpecList, SpecItem, specListVariants }
export type { SpecItemProps }
