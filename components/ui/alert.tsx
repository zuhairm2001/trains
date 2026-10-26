import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Alerts are margin notes: a rounded strip with a 2px rule in the signal ink (an inset shadow,
 * so it follows the corner radius) and a tinted wash (06, 13). One alert, one signal. Keep the icon and the words — never colour alone.
 */
const alertVariants = cva(
  "group/alert relative grid w-full grid-cols-[1fr] items-start gap-x-3 gap-y-0.5 rounded-lg border px-4 py-3 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-data-[slot=alert-action]:grid-cols-[1fr_auto] has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_1fr_auto] *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-card-foreground inset-shadow-[2px_0_0_var(--foreground)] *:[svg]:text-foreground",
        info: "border-info/30 bg-info-wash inset-shadow-[2px_0_0_var(--info)] text-foreground *:[svg]:text-info",
        positive:
          "border-positive/30 bg-positive-wash inset-shadow-[2px_0_0_var(--positive)] text-foreground *:[svg]:text-positive",
        caution:
          "border-caution/30 bg-caution-wash inset-shadow-[2px_0_0_var(--caution)] text-foreground *:[svg]:text-caution",
        destructive:
          "border-destructive/30 bg-destructive-wash inset-shadow-[2px_0_0_var(--destructive)] text-foreground *:[svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-sm font-medium text-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-pretty text-muted-foreground group-has-[>svg]/alert:col-start-2 [&_a]:text-info [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-2",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-center group-has-[>svg]/alert:col-start-3",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
