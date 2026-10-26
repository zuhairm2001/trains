"use client";

import { useState } from "react";
import { ArrowRightIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { type Change, type PartSnapshot, locationFields, locationLabels } from "@/lib/contracts";
import { displayDate } from "@/lib/api";
import { EmptyState, legend } from "@/components/tracker-common";

const actionLabels: Record<Change["action"], string> = { created: "Part registered", updated: "Record updated", swapped: "Placement swapped" };

function snapshotRows(snapshot: PartSnapshot | null): [string, string][] {
  if (!snapshot) return [];
  return [
    ["Serial number", snapshot.serialNumber], ["Part name", snapshot.name], ["DTR number", snapshot.dtrNo],
    ["Revision", snapshot.revision], ["Datecode", String(snapshot.datecode)], ["Installation date", snapshot.dateInstalled ?? "Not installed"],
    ...locationFields.map((field): [string, string] => [locationLabels[field], snapshot.location[field] || "—"]),
    ["Record operator", snapshot.operator],
    ["Subpart slots → stable IDs", Object.entries(snapshot.subParts).sort(([a], [b]) => a.localeCompare(b)).map(([slot, id]) => `${slot} → ${id}`).join("\n") || "No subparts"],
  ];
}

function HistoryEvent({ change, openPart, global }: { change: Change; openPart: (id: string) => void; global: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const after = snapshotRows(change.currentPart);
  const before = new Map(snapshotRows(change.previousPart));
  const changed = after.filter(([key, value]) => before.get(key) !== value).length;
  return <TimelineItem time={displayDate(change.date, true)} dateTime={change.date} state={change.action === "swapped" ? "marked" : "default"} title={<span className="inline-flex flex-wrap items-center gap-2">{actionLabels[change.action]}<Badge>{change.action}</Badge></span>} description={`Recorded by ${change.operator}`}>
    <div className="mt-3 space-y-3">
      {global && <Button variant="bracket" className="max-w-full whitespace-normal text-left" onClick={() => openPart(change.partId)}>{change.currentPart.serialNumber}<ArrowRightIcon /></Button>}
      <p className="whitespace-pre-wrap break-words text-sm">{change.note}</p>
      {change.counterpartId && <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Swap counterpart<Button variant="bracket" size="xs" className="max-w-full break-all whitespace-normal" onClick={() => openPart(change.counterpartId!)}>{change.counterpartId}<ArrowRightIcon /></Button></p>}
      <div className="space-y-1 font-mono text-[11px] text-muted-foreground"><p className="break-all">EVENT · {change.changeId}</p><p className="break-all">TXN · {change.transactionId}</p><p className="break-all">PART · {change.partId}</p></div>
      <Button variant="outline" size="sm" aria-expanded={expanded} aria-controls={`snapshot-${change.changeId}`} onClick={() => setExpanded((value) => !value)}>{expanded ? <CaretUpIcon /> : <CaretDownIcon />}{expanded ? "Hide snapshots" : `Inspect snapshots · ${changed} fields`}</Button>
      {expanded && <div id={`snapshot-${change.changeId}`} className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-3"><p className={legend}>Immutable event snapshots</p><p className="mt-1 text-xs text-muted-foreground">Highlighted values changed in this transaction. Dates and part-slot references are preserved exactly as recorded.</p>{!change.previousPart && <p className="mt-1 text-xs">Before: this physical record did not exist.</p>}</div>
        <Table><TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead></TableRow></TableHeader><TableBody>{after.map(([label, value]) => <TableRow key={label}><TableCell className="align-top text-xs whitespace-normal">{label}</TableCell><TableCell className="max-w-52 align-top font-mono text-[11px] break-words whitespace-pre-wrap">{change.previousPart ? before.get(label) : "Not yet registered"}</TableCell><TableCell className={`max-w-52 align-top font-mono text-[11px] break-words whitespace-pre-wrap ${before.get(label) !== value ? "bg-mark-wash" : ""}`}>{value}</TableCell></TableRow>)}</TableBody></Table>
      </div>}
    </div>
  </TimelineItem>;
}

export function PartHistory({ changes, openPart, global = false }: { changes: Change[]; openPart: (id: string) => void; global?: boolean }) {
  if (!changes.length) return <EmptyState title="No recorded activity">Changes will appear here when a part is created, edited or swapped.</EmptyState>;
  return <Timeline className="[--timeline-time:5rem] sm:[--timeline-time:7rem]">{changes.map((change) => <HistoryEvent key={change.changeId} change={change} openPart={openPart} global={global} />)}</Timeline>;
}
