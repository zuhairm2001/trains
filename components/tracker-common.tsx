"use client";

import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const legend = "font-mono text-[11px] uppercase tracking-wider text-muted-foreground";

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <Alert variant="destructive"><WarningCircleIcon aria-hidden="true" /><AlertTitle>Error: request could not be completed</AlertTitle><AlertDescription><p>{message}</p>{retry && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={retry}><ArrowClockwiseIcon />Retry request</Button>}</AlertDescription></Alert>;
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return <div role="status" aria-label="Loading records" className="space-y-3 p-5"><span className="sr-only">Loading records…</span>{Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="pattern-dots rounded-lg border bg-card px-5 py-14 text-center"><p className={`${legend} mb-3`}>{title}</p><div className="mx-auto max-w-md text-sm text-muted-foreground">{children}</div>{action && <div className="mt-5 flex justify-center">{action}</div>}</div>;
}
