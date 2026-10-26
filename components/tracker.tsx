"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowClockwiseIcon, ArrowRightIcon, ArrowsLeftRightIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, ClockCounterClockwiseIcon, FunnelIcon, MagnifyingGlassIcon, MoonIcon, PackageIcon, PlusIcon, SunIcon, TrainIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Change, type DTR, type LocationField, type MutationResponse, type Part, type PartsResponse, type Summary, locationFields, locationLabels, locationText } from "@/lib/contracts";
import { displayDate, useApi } from "@/lib/api";
import { PartRecord } from "@/components/part-detail";
import { PartForm } from "@/components/part-form";
import { PartHistory } from "@/components/part-history";
import { PartSwap } from "@/components/part-swap";
import { EmptyState, ErrorNotice, LoadingRows, legend } from "@/components/tracker-common";

type View = "register" | "activity";
type Filters = Record<LocationField | "q" | "dtrNo" | "datecode" | "serialNumber", string>;
const cleanFilters = (): Filters => ({ q: "", dtrNo: "", datecode: "", serialNumber: "", trainType: "", amc: "", ao: "", altona: "", localStorage: "", vbn: "", crl: "", other: "" });
const pageSize = 10;

function Pagination({ page, pages, total, onPage, noun = "parts" }: { page: number; pages: number; total: number; onPage: (value: number) => void; noun?: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><p className="text-xs text-muted-foreground">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} ${noun}` : `0 ${noun}`}</p><nav aria-label={`${noun} pagination`} className="flex items-center gap-2"><Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><CaretLeftIcon /></Button><span className="px-1 font-mono text-[11px] text-muted-foreground">{page} / {pages}</span><Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><CaretRightIcon /></Button></nav></div>;
}

function GlobalActivity({ revision, openPart }: { revision: number; openPart: (id: string) => void }) {
  const state = useApi<{ changes: Change[] }>("/api/changes", revision);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const changes = useMemo(() => [...(state.data?.changes ?? [])].filter((change) => [change.currentPart.serialNumber, change.currentPart.name, change.currentPart.dtrNo, change.operator, change.note, change.transactionId, change.partId].join(" ").toLowerCase().includes(search.toLowerCase().trim())).sort((a, b) => b.date.localeCompare(a.date)), [state.data, search]);
  const pages = Math.max(1, Math.ceil(changes.length / pageSize));
  const current = Math.min(page, pages);
  return <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-medium">Global activity</h2><p className="mt-1 text-sm text-muted-foreground">Every record, every change. A single chronological engineering log.</p></div><Button variant="outline" onClick={state.retry}><ArrowClockwiseIcon />Refresh activity</Button></div><div className="max-w-xl space-y-2"><Label htmlFor="activity-search">Find an event</Label><Input id="activity-search" placeholder="Serial, operator, reason or transaction ID…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>{state.loading ? <LoadingRows /> : state.error ? <ErrorNotice message={state.error} retry={state.retry} /> : changes.length ? <div className="overflow-hidden rounded-lg border bg-card"><div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"><p className={legend}>Audit ledger / newest first</p><Badge>{changes.length} events</Badge></div><div className="p-4 sm:p-6"><PartHistory changes={changes.slice((current - 1) * pageSize, current * pageSize)} openPart={openPart} global /></div><Pagination page={current} pages={pages} total={changes.length} noun="events" onPage={setPage} /></div> : <EmptyState title={search ? "No matching events" : "No activity yet"}>{search ? "Try a different serial, operator or transaction reference." : "Create, edit or swap a physical part to record its first event."}{search && <div className="mt-4"><Button variant="outline" onClick={() => setSearch("")}>Clear search</Button></div>}</EmptyState>}</section>;
}

export function Tracker() {
  const [view, setView] = useState<View>("register");
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState<Filters>(cleanFilters);
  const [advanced, setAdvanced] = useState(false);
  const [sort, setSort] = useState("serial-asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Part | "create" | null>(null);
  const [swap, setSwap] = useState<{ initialId?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const summary = useApi<Summary>("/api/summary", revision);
  const dtrs = useApi<{ dtrs: DTR[] }>("/api/dtrs", revision);
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value.trim())).toString();
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 220); return () => clearTimeout(timer); }, [query]);
  const records = useApi<PartsResponse>(`/api/parts${debouncedQuery ? `?${debouncedQuery}` : ""}`, revision);
  const filtering = query !== debouncedQuery;
  const filterCount = Object.values(filters).filter((value) => value.trim()).length;
  const sorted = useMemo(() => {
    const values = [...(records.data?.parts ?? [])];
    const [field, direction] = sort.split("-");
    const multiplier = direction === "asc" ? 1 : -1;
    return values.sort((a, b) => multiplier * (field === "datecode" ? a.datecode - b.datecode : field === "dtr" ? a.dtrNo.localeCompare(b.dtrNo, undefined, { numeric: true }) : a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true })) || a.id.localeCompare(b.id));
  }, [records.data, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setMounted(true);
    const sync = () => setView(window.location.hash === "#activity" ? "activity" : "register");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function setFilter(field: keyof Filters, value: string) { setFilters((current) => ({ ...current, [field]: value })); setPage(1); }
  function resetFilters() { setFilters(cleanFilters()); setPage(1); }
  function saved(result: MutationResponse) { setRevision((value) => value + 1); if (!selectedId && result.parts[0]) setSelectedId(result.parts[0].id); }
  function refresh() { setRevision((value) => value + 1); }
  const navItems = [{ id: "register" as const, title: "Parts register", icon: PackageIcon, count: summary.data?.totalParts }, { id: "activity" as const, title: "Global activity", icon: ClockCounterClockwiseIcon, count: summary.data?.changes }];

  return <div className="min-h-dvh bg-background text-foreground">
    <a href="#main-content" className="sr-only fixed top-2 left-2 z-50 rounded-md bg-foreground p-3 text-background focus:not-sr-only">Skip to content</a>
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r bg-card lg:flex" aria-label="Workspace navigation">
      <a href="#register" onClick={() => setView("register")} className="flex h-20 items-center gap-3 border-b px-6">
        <span className="flex size-9 items-center justify-center rounded-md bg-foreground text-background"><TrainIcon size={23} weight="light" aria-hidden="true" /></span>
        <span><span className="block text-xl font-medium tracking-tight">Rail<span className="ml-1 text-muted-foreground">/</span></span><span className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Engineering records</span></span>
      </a>
      <div className="px-4 py-7"><p className={`${legend} mb-3 px-2`}>Workspace</p><nav className="space-y-1">{navItems.map(({ id, title, icon: Icon, count }) => <Button key={id} asChild variant={view === id ? "default" : "ghost"} className="h-10 w-full justify-start px-3"><a href={`#${id}`} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}><Icon className="size-4" /><span className="flex-1 text-left text-[11px]">{title}</span><span className="font-mono text-[11px] opacity-65">{count !== undefined ? String(count).padStart(2, "0") : "—"}</span></a></Button>)}</nav></div>
      <div className="mx-6 mt-auto space-y-4 border-t py-5"><div><Badge variant="mark">Mock workspace</Badge><p className="mt-3 text-xs leading-relaxed text-muted-foreground">A working register with in-memory data. Changes reset when the API restarts.</p></div><Separator /><p className="font-mono text-[11px] uppercase leading-5 tracking-wider text-muted-foreground">Bun + Elysia / local API<br />Convex disconnected</p></div>
    </aside>
    <div className="min-w-0 lg:ml-56"><header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card/60 px-4 sm:px-7"><div className="flex min-w-0 items-center gap-3"><TrainIcon className="size-5 lg:hidden" aria-hidden="true" /><p className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span className="hidden sm:inline">Workspace <span className="px-2">/</span></span><span className="text-foreground">{view === "register" ? "Parts register" : "Global activity"}</span></p></div><div className="flex shrink-0 items-center gap-3"><Badge variant="mark" className="hidden sm:inline-flex">In-memory demo</Badge><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Toggle light and dark theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}</Button></TooltipTrigger><TooltipContent>Switch to {mounted && resolvedTheme === "dark" ? "light" : "dark"} theme</TooltipContent></Tooltip></div></header>
      <nav aria-label="Mobile workspace navigation" className="flex gap-2 border-b px-4 py-3 lg:hidden">{navItems.map(({ id, icon: Icon }) => <Button key={id} asChild variant={view === id ? "default" : "outline"} className="flex-1"><a href={`#${id}`} onClick={() => setView(id)} aria-current={view === id ? "page" : undefined}><Icon />{id === "register" ? "Register" : "Activity"}</a></Button>)}</nav>
      <main id="main-content" className="mx-auto max-w-[1600px] space-y-7 px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
        <section className="flex flex-wrap items-end justify-between gap-5"><div><p className={`${legend} mb-3`}>Rolling stock / physical asset control</p><h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{view === "register" ? "Parts register" : "Activity ledger"}<span className="ml-2 text-muted-foreground">.</span></h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{view === "register" ? "Every part has a place. Every movement leaves a record." : "The complete chain of changes, from registration to the next placement."}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSwap({})}><ArrowsLeftRightIcon />Swap parts</Button><Button onClick={() => setEditor("create")}><PlusIcon />Register part</Button></div></section>
        <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3"><WarningCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Demonstration data only.</span> This workspace uses mock, in-memory records. All changes reset when the API restarts. Convex is disconnected; no external data is read or written.</p></div>
        {summary.error ? <ErrorNotice message={summary.error} retry={summary.retry} /> : summary.loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Loading register summary">{[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-40 rounded-lg" />)}</div> : summary.data && <StatGrid columns={4}><Stat index="01" label="Physical parts" value={summary.data.totalParts} footnote="Stable identities across every placement" /><Stat index="02" label="Installed" value={summary.data.installedParts} footnote={`Across ${summary.data.trainTypes} train types`} /><Stat index="03" label="Stored / unassigned" value={summary.data.storedParts} footnote="No current installation date" /><Stat index="04" label="DTR definitions" value={summary.data.dtrCount} footnote="Shared definitions, individual histories" /></StatGrid>}
        {view === "activity" ? <GlobalActivity revision={revision} openPart={setSelectedId} /> : <section className="space-y-4" aria-labelledby="register-title">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 id="register-title" className="text-lg font-medium">All parts</h2><Badge>{records.data ? records.data.total : "—"} records</Badge></div><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={refresh}><ArrowClockwiseIcon />Refresh data</Button></TooltipTrigger><TooltipContent>Reload records, definitions and summary</TooltipContent></Tooltip></div>
          <Collapsible open={advanced} onOpenChange={setAdvanced} className="rounded-lg border bg-card p-4"><div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.6fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_7rem_auto]">
            <div className="space-y-2"><Label htmlFor="filter-search">Search the register</Label><div className="relative"><MagnifyingGlassIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden="true" /><Input id="filter-search" className="pl-9" placeholder="Serial, DTR or part name…" value={filters.q} onChange={(event) => setFilter("q", event.target.value)} /></div></div>
            <div className="space-y-2"><Label htmlFor="filter-train-type">Train type</Label><Input id="filter-train-type" value={filters.trainType} onChange={(event) => setFilter("trainType", event.target.value)} placeholder="All train types" /></div>
            <div className="space-y-2"><Label htmlFor="filter-dtr">DTR definition</Label><NativeSelect id="filter-dtr" className="w-full" value={filters.dtrNo} onChange={(event) => setFilter("dtrNo", event.target.value)} disabled={dtrs.loading}><NativeSelectOption value="">All definitions</NativeSelectOption>{dtrs.data?.dtrs.map((dtr) => <NativeSelectOption key={dtr.dtrNo} value={dtr.dtrNo}>{dtr.dtrNo} · {dtr.name}</NativeSelectOption>)}</NativeSelect></div>
            <div className="space-y-2"><Label htmlFor="filter-datecode">Datecode</Label><Input id="filter-datecode" type="number" min="0" step="1" value={filters.datecode} onChange={(event) => setFilter("datecode", event.target.value)} placeholder="Any" /></div>
            <CollapsibleTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><FunnelIcon />Locations<CaretDownIcon className={advanced ? "rotate-180" : ""} /></Button></CollapsibleTrigger>
          </div><CollapsibleContent><div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-4">{locationFields.filter((field) => field !== "trainType").map((field) => <div key={field} className="space-y-2"><Label htmlFor={`filter-${field}`}>{locationLabels[field]}</Label><Input id={`filter-${field}`} value={filters[field]} onChange={(event) => setFilter(field, event.target.value)} placeholder={`Any ${locationLabels[field]}`} /></div>)}<div className="space-y-2"><Label htmlFor="filter-serial">Serial number</Label><Input id="filter-serial" value={filters.serialNumber} onChange={(event) => setFilter("serialNumber", event.target.value)} placeholder="Serial contains…" /></div></div><p className="mt-3 text-xs text-muted-foreground">All eight location fields are searchable, including train type above. Filters combine; text matches ignore case. Datecode matches exactly.</p></CollapsibleContent>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{filterCount ? `${filterCount} active filters` : "Showing the complete register"}</p><Button variant="bracket" disabled={!filterCount} onClick={resetFilters}>Reset filters</Button></div>
          </Collapsible>
          {dtrs.error && <ErrorNotice message={`DTR definitions could not be loaded: ${dtrs.error}`} retry={dtrs.retry} />}
          <div className="overflow-hidden rounded-lg border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><p className={legend}>Physical asset ledger <span className="hidden sm:inline">/ identities are permanent</span></p><div className="flex items-center gap-2"><Label htmlFor="register-sort" className="text-xs text-muted-foreground">Sort by</Label><NativeSelect id="register-sort" size="sm" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><NativeSelectOption value="serial-asc">Serial ↑</NativeSelectOption><NativeSelectOption value="serial-desc">Serial ↓</NativeSelectOption><NativeSelectOption value="dtr-asc">DTR ↑</NativeSelectOption><NativeSelectOption value="dtr-desc">DTR ↓</NativeSelectOption><NativeSelectOption value="datecode-desc">Datecode ↓</NativeSelectOption><NativeSelectOption value="datecode-asc">Datecode ↑</NativeSelectOption></NativeSelect></div></div>
            {records.loading || filtering ? <LoadingRows count={7} /> : records.error ? <div className="p-4"><ErrorNotice message={records.error} retry={records.retry} /></div> : !sorted.length ? <div className="p-4"><EmptyState title={filterCount ? "No matching parts" : "The register is empty"} action={<Button variant="outline" onClick={filterCount ? resetFilters : () => setEditor("create")}>{filterCount ? "Reset filters" : "Register first part"}</Button>}>{filterCount ? "No physical parts match this combination. Try a broader search or clear the filters." : "Register a physical part against an existing DTR definition to begin its history."}</EmptyState></div> : <>
              <Table className="min-w-[880px]"><TableHeader><TableRow><TableHead className="pl-4">Serial / part name</TableHead><TableHead>DTR number</TableHead><TableHead>Train type</TableHead><TableHead>Placement</TableHead><TableHead>Rev.</TableHead><TableHead className="text-right">Datecode</TableHead><TableHead>Installed</TableHead><TableHead className="pr-4 text-right"><span className="sr-only">Details</span></TableHead></TableRow></TableHeader>
                <TableBody>{visible.map((part) => <TableRow key={part.id} data-state={selectedId === part.id ? "selected" : undefined}>
                  <TableCell className="max-w-64 pl-4"><Button variant="bracket" className="max-w-full break-all whitespace-normal text-left" onClick={() => setSelectedId(part.id)}>{part.serialNumber}</Button><p className="mt-1 truncate text-xs text-muted-foreground" title={part.name}>{part.name}</p></TableCell>
                  <TableCell className="font-mono text-xs">{part.dtrNo}</TableCell><TableCell><span className="font-mono text-xs">{part.location.trainType || "—"}</span></TableCell>
                  <TableCell className="max-w-56"><p className="truncate text-xs" title={locationText(part.location)}>{locationText(part.location)}</p><span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{part.dateInstalled ? "Installed" : "Stored / unassigned"}</span></TableCell>
                  <TableCell className="font-mono text-xs">{part.revision}</TableCell><TableCell className="text-right font-mono text-xs tabular-nums">{part.datecode}</TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{part.dateInstalled ? displayDate(part.dateInstalled) : "—"}</TableCell>
                  <TableCell className="pr-4 text-right"><Button variant="ghost" size="icon-sm" aria-label={`Open ${part.serialNumber} details`} onClick={() => setSelectedId(part.id)}><ArrowRightIcon /></Button></TableCell>
                </TableRow>)}</TableBody>
              </Table><Pagination page={currentPage} pages={pages} total={sorted.length} onPage={setPage} />
            </>}
          </div>
          <p className="flex flex-wrap justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>One record per physical serial · no destructive deletes</span><span>Rail / Parts register</span></p>
        </section>}
      </main>
    </div>
    {selectedId && <PartRecord key={selectedId} id={selectedId} revision={revision} onClose={() => setSelectedId(null)} openPart={setSelectedId} editPart={setEditor} swapPart={(initialId) => setSwap({ initialId })} />}
    {editor && <PartForm key={editor === "create" ? "create" : `${editor.id}-${editor.version}`} part={editor === "create" ? undefined : editor} dtrs={dtrs.data?.dtrs ?? []} dtrLoading={dtrs.loading} dtrError={dtrs.error} retryDtrs={dtrs.retry} onClose={() => setEditor(null)} onSaved={saved} />}
    {swap && <PartSwap initialId={swap.initialId} onClose={() => setSwap(null)} onSaved={saved} />}
  </div>;
}
