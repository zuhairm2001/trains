"use client";

import { useRef, useState, type FormEvent } from "react";
import { CircleNotchIcon, FloppyDiskIcon, PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { type DTR, type Part, type Location, type MutationResponse, emptyLocation, locationFields, locationLabels } from "@/lib/contracts";
import { apiRequest } from "@/lib/api";
import { ErrorNotice, legend } from "@/components/tracker-common";

export function PartForm({ part, dtrs, dtrLoading = false, dtrError = null, retryDtrs, onClose, onSaved }: { part?: Part; dtrs: DTR[]; dtrLoading?: boolean; dtrError?: string | null; retryDtrs?: () => void; onClose: () => void; onSaved: (result: MutationResponse) => void }) {
  const [serialNumber, setSerial] = useState(part?.serialNumber ?? "");
  const [dtrNo, setDtr] = useState(part?.dtrNo ?? "");
  const [revision, setRevision] = useState(part?.revision ?? "");
  const [datecode, setDatecode] = useState(part ? String(part.datecode) : "");
  const [location, setLocation] = useState<Location>(() => part ? { ...part.location } : emptyLocation());
  const [dateInstalled, setInstalled] = useState(part?.dateInstalled?.slice(0, 10) ?? "");
  const [operator, setOperator] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const installed = Boolean(dateInstalled);
  const prefix = part ? "edit" : "create";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!operator.trim() || !note.trim()) { setError("Enter an operator and a reason for this transaction."); return; }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const input = {
        location, revision: revision.trim(), datecode: Number(datecode),
        dateInstalled: installed ? (part?.dateInstalled && dateInstalled === part.dateInstalled.slice(0, 10) ? part.dateInstalled : dateInstalled) : null,
        operator: operator.trim(), note: note.trim(),
        ...(part ? { expectedVersion: part.version } : { serialNumber: serialNumber.trim(), dtrNo }),
      };
      const result = await apiRequest<MutationResponse>(part ? `/api/parts/${encodeURIComponent(part.id)}` : "/api/parts", { method: part ? "PATCH" : "POST", body: JSON.stringify(input) });
      toast.success(part ? "Part record updated" : "Part registered", { description: "The transaction and full snapshots have been recorded." });
      onSaved(result);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this record. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !submitting.current) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" onInteractOutside={(event) => { if (busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{part ? "Edit part record" : "Register a physical part"}</DialogTitle><DialogDescription>{part ? "Serial number, DTR definition and stable record ID cannot change. Every edit retains the previous snapshot." : "Assign a unique serial number to an existing DTR definition. This creates a tracked physical record."}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-5">
      {!part && (dtrError ? <ErrorNotice message={`DTR definitions could not be loaded: ${dtrError}`} retry={retryDtrs} /> : !dtrs.length ? <p role="status" className="text-sm text-muted-foreground">{dtrLoading ? "Loading existing DTR definitions…" : "No DTR definitions are available. A definition is required before a physical part can be registered."}</p> : null)}
      <fieldset disabled={busy} className="space-y-5">
        {part && <div className="rounded-lg border bg-muted p-3 font-mono text-[11px] break-all">ID · {part.id}<br />VERSION · {part.version}</div>}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${prefix}-serial`}>Serial number <span aria-hidden="true">*</span></Label><Input id={`${prefix}-serial`} value={serialNumber} onChange={(event) => setSerial(event.target.value)} required readOnly={Boolean(part)} maxLength={100} placeholder="Unique physical serial" className="font-mono" /></div><div className="space-y-2"><Label htmlFor={`${prefix}-dtr`}>DTR definition <span aria-hidden="true">*</span></Label>{part ? <Input id={`${prefix}-dtr`} value={dtrNo} readOnly className="font-mono" /> : <NativeSelect id={`${prefix}-dtr`} className="w-full" required value={dtrNo} onChange={(event) => setDtr(event.target.value)}><NativeSelectOption value="">Select a DTR definition</NativeSelectOption>{dtrs.map((dtr) => <NativeSelectOption key={dtr.dtrNo} value={dtr.dtrNo}>{dtr.dtrNo} · {dtr.name}</NativeSelectOption>)}</NativeSelect>}</div><div className="space-y-2"><Label htmlFor={`${prefix}-revision`}>Revision <span aria-hidden="true">*</span></Label><Input id={`${prefix}-revision`} value={revision} onChange={(event) => setRevision(event.target.value)} required maxLength={64} placeholder="e.g. A.1" /></div><div className="space-y-2"><Label htmlFor={`${prefix}-datecode`}>Datecode <span aria-hidden="true">*</span></Label><Input id={`${prefix}-datecode`} type="number" min="0" step="1" value={datecode} onChange={(event) => setDatecode(event.target.value)} required placeholder="Numeric manufacturing code" /></div></div>
        <Separator />
        <section className="space-y-4" aria-labelledby={`${prefix}-location-title`}><div><h3 id={`${prefix}-location-title`} className={legend}>Placement / all location fields</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">An installation date marks this part as installed and requires a train type. Leave the date empty for stored or unassigned parts. Assembly placement edits also move all descendants; a nested part cannot have a different location or installed/stored state from its parent.</p></div><div className="grid gap-4 sm:grid-cols-2">{locationFields.map((field) => <div key={field} className="space-y-2"><Label htmlFor={`${prefix}-location-${field}`}>{locationLabels[field]}{field === "trainType" && installed && <span aria-hidden="true"> *</span>}</Label><Input id={`${prefix}-location-${field}`} required={field === "trainType" && installed} value={location[field]} onChange={(event) => setLocation((current) => ({ ...current, [field]: event.target.value }))} maxLength={160}  /></div>)}</div><div className="space-y-2"><Label htmlFor={`${prefix}-installed`}>Installation date</Label><Input id={`${prefix}-installed`} type="date" value={dateInstalled} onChange={(event) => setInstalled(event.target.value)} aria-describedby={`${prefix}-installed-hint`} /><p id={`${prefix}-installed-hint`} className="text-xs text-muted-foreground">{installed ? "Installed — date this physical part was installed at the current placement." : "Not installed — leave empty for storage or an unassigned part."}</p></div></section>
        <Separator />
        <div className="space-y-4"><div className="space-y-2"><Label htmlFor={`${prefix}-operator`}>Operator <span aria-hidden="true">*</span></Label><Input id={`${prefix}-operator`} value={operator} onChange={(event) => setOperator(event.target.value)} required pattern=".*\S.*" maxLength={100} placeholder="Your name or engineering identifier" /></div><div className="space-y-2"><Label htmlFor={`${prefix}-reason`}>Reason for {part ? "change" : "registration"} <span aria-hidden="true">*</span></Label><Textarea id={`${prefix}-reason`} value={note} onChange={(event) => setNote(event.target.value)} required maxLength={2000} minLength={1} rows={3} placeholder="Describe the work and reference, if applicable." /></div></div>
      </fieldset>
      {error && <ErrorNotice message={`${error} Your entries have been kept. If this record changed elsewhere, close this form, refresh the record and try again.`} />}
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || (!part && !dtrs.length)}>{busy ? <CircleNotchIcon className="animate-spin" /> : part ? <FloppyDiskIcon /> : <PlusIcon />}{busy ? "Saving record…" : part ? "Save changes" : "Register part"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
