"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowsLeftRightIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SpecItem, SpecList } from "@/components/ui/spec-list";
import { Badge } from "@/components/ui/badge";
import { type MutationResponse, type Part, type PartDetail, type PartsResponse, locationFields, locationLabels } from "@/lib/contracts";
import { apiRequest, displayDate, useApi } from "@/lib/api";
import { EmptyState, ErrorNotice, LoadingRows, legend } from "@/components/tracker-common";

function PlacementCard({ part, label }: { part: Part; label: string }) {
  return <section className="min-w-0 space-y-3 rounded-lg border bg-card p-4"><p className={legend}>{label}</p><div><p className="break-all font-mono text-xs">{part.serialNumber}</p><p className="mt-1 text-sm">{part.name}</p></div><Badge>{part.dateInstalled ? "Installed" : "Stored / unassigned"}</Badge><SpecList variant="leader">{locationFields.map((field) => <SpecItem key={field} label={locationLabels[field]}><span className="break-all">{part.location[field] || "—"}</span></SpecItem>)}<SpecItem label="Installed">{displayDate(part.dateInstalled)}</SpecItem><SpecItem label="Descendants">{Object.keys(part.subParts).length} direct subparts</SpecItem><SpecItem label="Version">{part.version}</SpecItem></SpecList></section>;
}

export function PartSwap({ initialId, onClose, onSaved }: { initialId?: string; onClose: () => void; onSaved: (result: MutationResponse) => void }) {
  const [sourceId, setSource] = useState(initialId ?? "");
  const [targetId, setTarget] = useState("");
  const [operator, setOperator] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const submitting = useRef(false);
  const all = useApi<PartsResponse>("/api/parts", revision);
  const sourceState = useApi<PartDetail>(sourceId ? `/api/parts/${encodeURIComponent(sourceId)}` : null, revision);
  const source = sourceState.data?.part.id === sourceId ? sourceState.data.part : null;
  const eligible = useApi<{ parts: Part[] }>(source ? `/api/parts/${encodeURIComponent(source.id)}/eligible` : null, revision);
  const target = eligible.data?.parts.find((part) => part.id === targetId) ?? null;
  const pending = all.loading || sourceState.loading || eligible.loading;
  const canSwap = Boolean(source && target && source.id !== target.id && source.dtrNo === target.dtrNo && !pending && !busy);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSwap || !source || !target || submitting.current) return;
    if (!operator.trim() || !note.trim()) { setError("Enter an operator and a reason for the swap."); return; }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<MutationResponse>("/api/swaps", { method: "POST", body: JSON.stringify({ partId: source.id, counterpartId: target.id, expectedVersion: source.version, counterpartVersion: target.version, operator: operator.trim(), note: note.trim() }) });
      toast.success("Placements exchanged", { description: "All affected assemblies and their history were saved in one transaction." });
      onSaved(result);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to swap these parts. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy} onInteractOutside={(event) => { if (busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
    <DialogHeader><DialogTitle>Swap physical part placements</DialogTitle><DialogDescription>Exchange placements between two compatible records of the same DTR definition. Review both locations before recording the transaction.</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-5"><fieldset disabled={busy} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="swap-source">Source part</Label>{all.error ? <ErrorNotice message={all.error} retry={all.retry} /> : <NativeSelect id="swap-source" className="w-full" value={sourceId} required disabled={all.loading} onChange={(event) => { setSource(event.target.value); setTarget(""); setError(null); }}><NativeSelectOption value="">{all.loading ? "Loading all physical records…" : "Select a physical part"}</NativeSelectOption>{all.data?.parts.map((part) => <NativeSelectOption key={part.id} value={part.id}>{part.serialNumber} · {part.name} · {part.dtrNo}</NativeSelectOption>)}</NativeSelect>}</div>
      {sourceState.error && <ErrorNotice message={sourceState.error} retry={sourceState.retry} />}
      {sourceState.loading && <LoadingRows count={2} />}
      {source && <><div className="space-y-2"><Label htmlFor="swap-target">Compatible counterpart · {source.dtrNo}</Label>{eligible.error ? <ErrorNotice message={eligible.error} retry={eligible.retry} /> : eligible.loading ? <p role="status" className="text-sm text-muted-foreground">Finding compatible physical parts…</p> : eligible.data?.parts.length ? <NativeSelect id="swap-target" className="w-full" required value={targetId} onChange={(event) => setTarget(event.target.value)}><NativeSelectOption value="">Select a compatible counterpart</NativeSelectOption>{eligible.data.parts.map((part) => <NativeSelectOption key={part.id} value={part.id}>{part.serialNumber} · {part.dateInstalled ? "Installed" : "Stored / unassigned"}</NativeSelectOption>)}</NativeSelect> : <EmptyState title="No compatible counterparts">There are no other eligible parts for this DTR. A part cannot swap with itself or an ancestor / descendant.</EmptyState>}</div>
      <div className="grid gap-3 sm:grid-cols-2"><PlacementCard part={source} label="01 / source placement" />{target ? <PlacementCard part={target} label="02 / counterpart placement" /> : <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Select a counterpart to compare placements.</div>}</div>
      <div className="rounded-lg border bg-muted p-4 text-sm leading-relaxed"><p className="font-medium">Placements move. Physical identities stay.</p><p className="mt-2 text-muted-foreground">Serial numbers, IDs, revision, datecode and existing history remain with each physical part. Parent slots are exchanged and descendants travel with their assembly. Installed destinations receive the transaction date; stored destinations have no installation date. Every affected record is logged atomically under one transaction ID. Stale versions are rejected without partial changes.</p></div></>}
      <div className="grid gap-4"><div className="space-y-2"><Label htmlFor="swap-operator">Operator <span aria-hidden="true">*</span></Label><Input id="swap-operator" required value={operator} maxLength={100} onChange={(event) => setOperator(event.target.value)} placeholder="Your name or engineering identifier" /></div><div className="space-y-2"><Label htmlFor="swap-note">Reason for swap <span aria-hidden="true">*</span></Label><Textarea id="swap-note" required value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Describe the exchange and work reference." /></div></div>
    </fieldset>
    {error && <ErrorNotice message={`${error} Refresh both records and inspect their history before attempting another swap. A network failure can occur after a transaction has committed.`} retry={() => { setRevision((value) => value + 1); setError(null); }} />}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={!canSwap}>{busy ? <CircleNotchIcon className="animate-spin" /> : <ArrowsLeftRightIcon />}{busy ? "Recording swap…" : "Confirm atomic swap"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
