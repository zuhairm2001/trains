# Rail — Parts register

A working train-parts tracker built with **Next.js**, **Bun**, and **Elysia**. Uses the parent `design-system` project's **Precision Interface** shadcn components, its light/dark tokens, and locally served IBM Plex fonts.

**This draft uses mock, in-memory storage. Convex is disconnected: no credentials, database writes, subscriptions, or sync traffic are used. Restarting the API restores the seed inventory.** Your existing `.env` is untouched.

## Run

Requires Bun 1.3+; verified with Bun 1.4.0. Node 20.9+ is required for the Next.js build tooling.

```sh
bun install
bun run dev
```

Open **http://localhost:3000**. The launcher runs both the Next.js frontend and the Elysia API, and stops both when interrupted. API listens on port **3001**; frontend requests use same-origin `/api/*` rewrites. No Convex setup is required.

```sh
bun run test       # Backend transaction and HTTP regression tests
bun run typecheck
bun run build
bun run start      # Both services, with the built Next.js app
```

Separate service commands: `bun run dev:web`, `bun run dev:api`, `bun run start:web`, `bun run start:api`.

Optional configuration is shown in `.env.example`: `API_PORT` changes the API listener; `API_URL` is the Next.js server-side proxy destination and must use the same port. The frontend remains on port 3000.

## Try it

The seed has **32 physical parts**, **8 DTR definitions**, **3 train types**, and nested traction-drive assemblies. All records and external reference links are explicitly synthetic.

- Search by serial, DTR, part name, datecode, or placement. Combine train type, DTR, exact numeric datecode, and **Locations** filters for AMC, AO, Altona, local storage, VBN, CRL, and Other. Text filtering ignores case and matches substrings; the serial filter also matches substrings.
- Open a serial to inspect its complete placement, specification, parent assembly, and child slots. Follow `TDU-2024-001` → `TRC-2024-001` → `IGB-2024-001` to explore multiple levels.
- Open **History**, then **Inspect snapshots** for complete before/after records, highlighted differences, operator, reason, timestamp, event ID, transaction ID, and swap counterpart.
- Use **Swap placement** to exchange a part with another physical part of the **same DTR number**. The comparison includes both placements and versions. Operator and reason are required by the interface.
- Use **Register part** to add a unique physical serial against an existing DTR definition, or **Edit record** to change revision, datecode, placement, installation date, and operator in place.
- **Global activity** collects every part's events, searchable by serial, operator, reason, or transaction ID.

## Model and invariants

`lib/contracts.ts` is the shared frontend/API contract. TypeScript uses camelCase for the supplied Go fields. DTR definitions are separate from physical parts; assembly slots are normalized as `subParts: Record<slot, partId>` rather than recursive object copies. A child has at most one parent. Assembly relationships are seeded and traversable; this draft does not expose arbitrary assembly-tree editing or DTR-definition editing.

- A part's **ID, serial number, and DTR definition stay stable**. Edits and swaps never delete/recreate physical records. Serial numbers are unique, ignoring case.
- Installation status is determined by `dateInstalled`, not by interpreting the location strings. Dates use `YYYY-MM-DD`; null means stored/unassigned. Installed parts require a train type. Datecode is a non-negative safe integer; no manufacturing-code format is assumed.
- A swap exchanges placements and parent-slot assignments, not serials, revisions, datecodes, descendants, or existing history. Descendants travel with their physical assembly. Installation dates become the transaction's UTC date at installed destinations, or null at stored destinations.
- Root-assembly placement edits propagate through descendants. Nested parts cannot be independently moved away from their parent; revision/datecode/operator edits remain independent. Cycles, multiple parents, and ancestor/descendant swaps are rejected.
- Every affected part receives a full immutable before/after snapshot. A shared transaction ID ties together both swap sides, descendants, and modified parent slots.
- Writes require expected part versions. Stale edits/swaps return **409** without publishing changes. Each transaction stages and validates the complete next state synchronously, then publishes it with one state-reference assignment; there is no await between validation and publication.
- Atomicity applies to **one running Bun API process only**. State and history are not durable and must not be split across API replicas. This is not a distributed transaction implementation.
- A failed network response does not prove a transaction was rejected. Inspect the latest records/history before attempting another swap; the interface never automatically retries writes.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Runtime/storage status; explicitly reports Convex disconnected |
| GET | `/api/summary` | Inventory and history counts |
| GET | `/api/dtrs` | Existing identification definitions and reference links |
| GET | `/api/parts` | List/filter physical parts |
| GET | `/api/parts/:id` | Part, DTR, history, parent and direct child records |
| GET | `/api/parts/:id/eligible` | Other same-DTR parts, excluding ancestry cycles |
| GET | `/api/changes` | Global history, newest first |
| POST | `/api/parts` | Create a physical part with its initial history snapshot |
| PATCH | `/api/parts/:id` | Version-checked in-place update |
| POST | `/api/swaps` | Version-checked atomic placement exchange |

List parameters: `q`, `serialNumber`, `dtrNo`, `datecode`, `trainType`, `amc`, `ao`, `altona`, `localStorage`, `vbn`, `crl`, `other`. Filters combine with AND. Unknown fields and invalid input are rejected. Mutations return all affected parts, their history entries, and the transaction ID. Errors are JSON `{ "error": "..." }`; 400 malformed request/filter, 404 missing record/route, 409 stale write/identity or hierarchy conflict, 422 invalid mutation/incompatible DTR.

## Convex boundary

`server/store.ts` currently implements the data operations; `server/app.ts` maps them to Elysia routes. A future Convex cutover should replace that store with actual queries/mutations and subscribe the frontend to reactive query results. The entire placement exchange, descendant/parent updates, version checks, and history inserts must execute inside **one Convex mutation**, not separate HTTP writes. Keep the stable IDs, normalized assembly references, and shared contract semantics when moving to durable storage. There is intentionally no fake Convex adapter or fallback that pretends to persist or synchronize data.

## Source map

- `app/`: Next.js entry, theme and typography.
- `components/ui/`: shadcn components installed from the local parent Precision registry. Tabs are adapted to Radix `data-state` / `data-orientation` attributes.
- `components/tracker.tsx`, `part-*`: register, activity, record/history, create/edit and swap workflows.
- `lib/contracts.ts`, `lib/api.ts`: domain/API types and cancellation-aware client requests.
- `server/`: Elysia API, atomic store, validation, mock inventory, and regression tests.
- `scripts/`: coordinated development/production service lifecycle.

**Local demonstration only.** There is no authentication or authorization; both listeners bind to all interfaces. Do not expose this draft to an untrusted network or use it for real fleet data. Add authentication/authorization and durable Convex storage before production deployment.
