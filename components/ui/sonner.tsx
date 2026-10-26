"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr"

import { buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/**
 * Toasts are notes lifted off the page: rounded, rule-strong outline, soft shadow, and a 2px
 * left rule in the signal ink for typed toasts (16, 18). Action is a key; dismiss a bracket.
 */
const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { resolvedTheme = "light" } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      gap={10}
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <Spinner aria-hidden="true" />,
      }}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        classNames: {
          toast:
            "cn-toast flex w-(--width) items-start gap-3 rounded-lg border border-rule-strong bg-popover p-3 pr-3.5 font-sans text-popover-foreground shadow-sheet-sm",
          icon: "relative mt-0.5 flex size-4 shrink-0 items-center justify-center text-foreground",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-sm font-medium text-foreground",
          description: "text-xs text-muted-foreground",
          actionButton: buttonVariants({ variant: "key", size: "xs", className: "shrink-0 self-center" }),
          cancelButton: buttonVariants({ variant: "bracket", size: "xs", className: "shrink-0 self-center" }),
          closeButton:
            "absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full border border-rule-strong bg-popover text-foreground outline-none hover:bg-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-3",
          success: "inset-shadow-[2px_0_0_var(--positive)] [&_[data-icon]]:text-positive",
          info: "inset-shadow-[2px_0_0_var(--info)] [&_[data-icon]]:text-info",
          warning: "inset-shadow-[2px_0_0_var(--caution)] [&_[data-icon]]:text-caution",
          error: "inset-shadow-[2px_0_0_var(--destructive)] [&_[data-icon]]:text-destructive",
          loading: "[&_[data-icon]]:text-muted-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
