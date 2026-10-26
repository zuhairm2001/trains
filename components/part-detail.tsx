"use client";

import { ArrowClockwiseIcon, ArrowRightIcon, ArrowSquareOutIcon, ArrowsLeftRightIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SpecItem, SpecList } from "@/components/ui/spec-list";
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { type Part, type PartDetail, locationFields, locationLabels, locationText } from "@/lib/contracts";
import { displayDate, useApi } from "@/lib/api";
import { PartHistory } from "@/components/part-history";
import { EmptyState, ErrorNotice, LoadingRows, legend } from "@/components/tracker-common";

function safeExternal(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}

export function PartRecord({ id, revision, onClose, openPart, editPart, swapPart }: { id: string; revision: number; onClose: () => void; openPart: (id: string) => void; editPart: (part: Part) => void; swapPart: (id: string) => void }) {
  const state = useApi<PartDetail>(`/api/parts/${encodeURIComponent(id)}`, revision);
  const detail = state.data?.part.id === id ? state.data : null;
  const part = detail?.part;
  const links = detail ? [["PLM", safeExternal(detail.dtr.plmLink)], ["Orchestra", safeExternal(detail.dtr.orchestraLink)]] as const : [];
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent className="gap-0 data-[side=right]:w-full sm:data-[side=right]:w-[48rem] sm:data-[side=right]:max-w-3xl">
    <SheetHeader className="border-b pr-14"><div className="mb-2 flex flex-wrap items-center gap-2"><p className={legend}>Physical part record</p>{part && <Badge variant="mark">{part.dateInstalled ? "Installed" : "Stored / unassigned"}</Badge>}</div><SheetTitle className="break-all font-heading text-2xl">{part?.serialNumber ?? "Part record"}</SheetTitle><SheetDescription>{part?.name ?? "Inspect this physical part, its placement and complete audit trail."}</SheetDescription></SheetHeader>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {state.loading && <LoadingRows />}
      {state.error && <ErrorNotice message={state.error} retry={state.retry} />}
      {part && detail && <div className="space-y-5">
        <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg border bg-muted p-3 font-mono text-[11px] text-muted-foreground"><span className="break-all">ID <span className="text-foreground">{part.id}</span></span><span>VER <span className="text-foreground">{part.version}</span></span><span>DTR <span className="text-foreground">{part.dtrNo}</span></span></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => editPart(part)}><PencilSimpleIcon />Edit record</Button><Button variant="outline" onClick={() => swapPart(part.id)}><ArrowsLeftRightIcon />Swap placement</Button><Button variant="ghost" size="icon" onClick={state.retry} aria-label="Refresh part record"><ArrowClockwiseIcon /></Button></div>
        <Tabs defaultValue="overview" className="gap-5"><TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="history">History<TabsCount>{detail.changes.length}</TabsCount></TabsTrigger></TabsList>
          <TabsContent value="overview" className="space-y-7">
            <section className="space-y-3"><h3 className={legend}>01 / record specification</h3><SpecList variant="grid" columns={2}><SpecItem label="Physical serial"><span className="break-all font-mono text-xs">{part.serialNumber}</span></SpecItem><SpecItem label="DTR definition"><span className="font-mono text-xs">{part.dtrNo}</span></SpecItem><SpecItem label="Part name">{part.name}</SpecItem><SpecItem label="DTR name">{detail.dtr.name}</SpecItem><SpecItem label="Revision">{part.revision}</SpecItem><SpecItem label="Datecode"><span className="font-mono text-xs">{part.datecode}</span></SpecItem><SpecItem label="Installed">{displayDate(part.dateInstalled)}</SpecItem><SpecItem label="Last record operator">{part.operator}</SpecItem></SpecList></section>
            <Separator />
            <section className="space-y-3"><h3 className={legend}>02 / complete placement</h3><p className="text-sm">{locationText(part.location)}</p><SpecList variant="ruled" className="[--spec-label:7rem] sm:[--spec-label:10rem]">{locationFields.map((field) => <SpecItem key={field} label={locationLabels[field]}><span className="break-words">{part.location[field] || "—"}</span></SpecItem>)}</SpecList></section>
            <section className="space-y-3"><h3 className={legend}>03 / assembly relationships</h3><p className="text-xs text-muted-foreground">Slots reference stable physical IDs. Open any record to continue through the assembly tree.</p>{detail.parents.length > 0 && <div className="overflow-hidden rounded-lg border"><p className={`${legend} border-b bg-muted px-3 py-2`}>Parent assembly</p>{detail.parents.map((parent) => <Button key={parent.id} variant="ghost" className="h-auto w-full justify-between gap-3 rounded-none px-3 py-3 text-left normal-case" onClick={() => openPart(parent.id)}><span className="min-w-0"><span className="block break-all font-mono text-xs">{parent.serialNumber}</span><span className="mt-1 block whitespace-normal font-sans text-xs text-muted-foreground">{parent.name}</span></span><ArrowRightIcon /></Button>)}</div>}{!detail.parents.length && <p className="text-xs text-muted-foreground">Root-level record · not assigned to a parent assembly.</p>}
              {Object.keys(part.subParts).length ? <div className="overflow-hidden rounded-lg border"><p className={`${legend} border-b bg-muted px-3 py-2`}>Subpart slots · {Object.keys(part.subParts).length}</p>{Object.entries(part.subParts).map(([slot, childId]) => { const child = detail.subParts.find((item) => item.id === childId); return <Button key={slot} variant="ghost" className="h-auto w-full justify-between gap-3 rounded-none border-b px-3 py-3 text-left normal-case last:border-0" onClick={() => openPart(childId)}><span className="min-w-0"><span className="block font-mono text-[11px] text-muted-foreground">SLOT · {slot}</span><span className="mt-1 block break-all font-mono text-xs">{child?.serialNumber ?? childId}</span><span className="mt-1 block whitespace-normal font-sans text-xs text-muted-foreground">{child?.name ?? "Open physical record"}</span></span><ArrowRightIcon /></Button>; })}</div> : <EmptyState title="No subparts">This record has no child parts assigned to assembly slots.</EmptyState>}
            </section>
            {links.some(([, url]) => url) && <section className="space-y-3"><h3 className={legend}>04 / definition references</h3><p className="text-xs text-muted-foreground">Mock reference links supplied with this in-memory DTR definition. No external system is connected.</p><div className="flex flex-wrap gap-3">{links.map(([label, url]) => url ? <Button key={label} variant="outline" asChild><a href={url} target="_blank" rel="noopener noreferrer">Mock {label}<ArrowSquareOutIcon /></a></Button> : null)}</div></section>}
          </TabsContent>
          <TabsContent value="history"><div className="mb-5"><h3 className={legend}>Immutable audit trail / newest first</h3><p className="mt-2 text-xs text-muted-foreground">Each event retains full before-and-after snapshots. Shared transaction IDs tie together swaps and assembly propagation.</p></div><PartHistory changes={[...detail.changes].sort((a, b) => b.date.localeCompare(a.date))} openPart={openPart} /></TabsContent>
        </Tabs>
      </div>}
    </div>
  </SheetContent></Sheet>;
}
