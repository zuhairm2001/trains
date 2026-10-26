import {
  locationFields,
  type Change,
  type DTR,
  type Location,
  type MutationResponse,
  type Part,
  type PartDetail,
  type PartSnapshot,
  type PartsResponse,
  type Summary,
  type UpdatePartInput,
} from "../lib/contracts";
import { mockSeed } from "./seed";
import { ApiError, parseCreatePart, parseFilters, parseSwap, parseUpdatePart } from "./validation";

interface State {
  parts: Map<string, Part>;
  dtrs: Map<string, DTR>;
  changes: Change[];
}

export interface StoreOptions {
  now?: () => Date;
  /** Supplying data replaces the mock seed and starts with an empty audit trail. */
  initialData?: { parts: Part[]; dtrs: DTR[] };
}

interface Transaction {
  affected: Set<string>;
  counterparts?: Map<string, string>;
}

function snapshot(part: Part): PartSnapshot {
  const { id: _id, version: _version, ...value } = part;
  return structuredClone(value);
}

function sameLocation(left: Location, right: Location): boolean {
  return locationFields.every((field) => left[field] === right[field]);
}

function requirePart(parts: Map<string, Part>, id: string): Part {
  const part = parts.get(id);
  if (!part) throw new ApiError(404, "The requested part was not found.");
  return part;
}

function requireVersion(part: Part, expected: number): void {
  if (part.version !== expected) {
    throw new ApiError(409, `${part.serialNumber} has changed since it was opened. Refresh the part and try again.`);
  }
}

function descendants(parts: Map<string, Part>, id: string): string[] {
  const result: string[] = [];
  const pending = Object.values(requirePart(parts, id).subParts);
  const visited = new Set<string>([id]);
  while (pending.length) {
    const childId = pending.pop()!;
    if (visited.has(childId)) throw new ApiError(409, "Assembly references must not contain cycles or duplicate children.");
    visited.add(childId);
    result.push(childId);
    pending.push(...Object.values(requirePart(parts, childId).subParts));
  }
  return result;
}

function parentReferences(parts: Map<string, Part>): Map<string, { parentId: string; slot: string }> {
  const parents = new Map<string, { parentId: string; slot: string }>();
  for (const parent of parts.values()) {
    for (const [slot, childId] of Object.entries(parent.subParts)) {
      if (!slot.trim()) throw new ApiError(422, "An assembly slot cannot be blank.");
      if (!parts.has(childId)) throw new ApiError(422, "An assembly references a part that does not exist.");
      if (parents.has(childId)) throw new ApiError(422, "A physical part cannot occupy more than one assembly slot.");
      parents.set(childId, { parentId: parent.id, slot });
    }
  }
  return parents;
}

function assertIntegrity(parts: Map<string, Part>, dtrs: Map<string, DTR>): void {
  const serials = new Set<string>();
  for (const [id, part] of parts) {
    if (id !== part.id) throw new ApiError(422, "A part ID does not match its stored identity.");
    const dtr = dtrs.get(part.dtrNo);
    if (!dtr || part.name !== dtr.name) throw new ApiError(422, "A part must reference its DTR identification definition.");
    const serial = part.serialNumber.trim().toLowerCase();
    if (!serial || serials.has(serial)) throw new ApiError(409, "Serial numbers must uniquely identify physical parts.");
    serials.add(serial);
    if (part.dateInstalled !== null && !part.location.trainType) throw new ApiError(422, "An installed part must have a train type.");
  }
  const parents = parentReferences(parts);
  // Each child has one parent, so checking its ancestry detects all cycles without
  // conflating legal nested assemblies with multiple-parent references.
  const checked = new Set<string>();
  for (const id of parts.keys()) {
    const chain = new Set<string>();
    let cursor: string | undefined = id;
    while (cursor && !checked.has(cursor)) {
      if (chain.has(cursor)) throw new ApiError(409, "Assembly references must not contain cycles.");
      chain.add(cursor);
      cursor = parents.get(cursor)?.parentId;
    }
    for (const member of chain) checked.add(member);
  }
  for (const [childId, { parentId }] of parents) {
    const child = requirePart(parts, childId);
    const parent = requirePart(parts, parentId);
    if (!sameLocation(child.location, parent.location) || (child.dateInstalled === null) !== (parent.dateInstalled === null)) {
      throw new ApiError(409, "An assembly and all of its subparts must share a location and installed/stored status.");
    }
  }
}

export class PartStore {
  private state: State;
  private readonly now: () => Date;

  constructor(options: StoreOptions = {}) {
    this.now = options.now ?? (() => new Date());
    const source = structuredClone(options.initialData ?? mockSeed());
    if (new Set(source.parts.map((part) => part.id)).size !== source.parts.length) {
      throw new ApiError(422, "Physical part IDs must be unique.");
    }
    if (new Set(source.dtrs.map((dtr) => dtr.dtrNo)).size !== source.dtrs.length) {
      throw new ApiError(422, "DTR identification numbers must be unique.");
    }
    this.state = {
      parts: new Map(source.parts.map((part) => [part.id, part])),
      dtrs: new Map(source.dtrs.map((dtr) => [dtr.dtrNo, dtr])),
      changes: [],
    };
    assertIntegrity(this.state.parts, this.state.dtrs);
    if (!options.initialData) this.seedHistory();
  }

  private seedHistory(): void {
    const transactionId = "mock-import-2026-10-20";
    this.state = {
      ...this.state,
      changes: [...this.state.parts.values()].map((part) => ({
        changeId: `mock-created-${part.id}`,
        transactionId,
        action: "created",
        partId: part.id,
        previousPart: null,
        currentPart: snapshot(part),
        date: "2026-10-20T08:00:00.000Z",
        operator: "Mock inventory import",
        note: "Synthetic demonstration inventory. Not a live fleet record.",
      })),
    };
    const examples = [
      ["part-bcu-002", "2026-10-21T09:15:00.000Z", "C", "Mock bench inspection completed; released to storage."],
      ["part-dcu-003", "2026-10-22T11:40:00.000Z", "E", "Mock firmware revision recorded after workshop inspection."],
      ["part-aux-001", "2026-10-23T14:05:00.000Z", "D", "Mock scheduled service; revision label verified."],
    ] as const;
    for (const [id, timestamp, revision, note] of examples) {
      const part = requirePart(this.state.parts, id);
      this.updateValidated(id, {
        expectedVersion: part.version,
        location: structuredClone(part.location),
        revision,
        datecode: part.datecode,
        dateInstalled: part.dateInstalled,
        operator: "Alex Morgan · mock",
        note,
      }, timestamp);
    }
  }

  list(query: unknown = {}): PartsResponse {
    const filters = parseFilters(query);
    const includes = (value: string, filter: string) => value.toLowerCase().includes(filter.toLowerCase());
    const parts = [...this.state.parts.values()].filter((part) => {
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        if (key === "q") {
          const haystack = [part.serialNumber, part.name, part.dtrNo, part.revision, String(part.datecode), ...locationFields.map((field) => part.location[field])];
          if (!haystack.some((entry) => includes(entry, value))) return false;
        } else if (key === "datecode") {
          if (part.datecode !== Number(value)) return false;
        } else if ((locationFields as readonly string[]).includes(key)) {
          if (!includes(part.location[key as keyof Location], value)) return false;
        } else if (!includes(part[key as "serialNumber" | "dtrNo"], value)) return false;
      }
      return true;
    });
    return { parts: structuredClone(parts), total: parts.length };
  }

  detail(id: string): PartDetail {
    const part = requirePart(this.state.parts, id);
    const parent = parentReferences(this.state.parts).get(id);
    return structuredClone({
      part,
      dtr: this.state.dtrs.get(part.dtrNo)!,
      changes: this.orderedChanges().filter((change) => change.partId === id),
      subParts: Object.values(part.subParts).map((childId) => requirePart(this.state.parts, childId)),
      parents: parent ? [requirePart(this.state.parts, parent.parentId)] : [],
    });
  }

  eligible(id: string): { parts: Part[] } {
    const part = requirePart(this.state.parts, id);
    const descendantsOfPart = new Set(descendants(this.state.parts, id));
    const parts = [...this.state.parts.values()].filter((candidate) => candidate.id !== id
      && candidate.dtrNo === part.dtrNo
      && !descendantsOfPart.has(candidate.id)
      && !descendants(this.state.parts, candidate.id).includes(id));
    return { parts: structuredClone(parts) };
  }

  dtrs(): { dtrs: DTR[] } {
    return { dtrs: structuredClone([...this.state.dtrs.values()]) };
  }

  private orderedChanges(): Change[] {
    return [...this.state.changes].sort((left, right) => right.date.localeCompare(left.date));
  }

  changes(): { changes: Change[] } {
    return { changes: structuredClone(this.orderedChanges()) };
  }

  summary(): Summary {
    const parts = [...this.state.parts.values()];
    const installedParts = parts.filter((part) => part.dateInstalled !== null).length;
    return {
      totalParts: parts.length,
      installedParts,
      storedParts: parts.length - installedParts,
      trainTypes: new Set(parts.map((part) => part.location.trainType).filter(Boolean)).size,
      dtrCount: this.state.dtrs.size,
      changes: this.state.changes.length,
    };
  }

  /** Every write is synchronous: stage, validate, then publish exactly one state reference. */
  private transact(
    action: Change["action"],
    operator: string,
    note: string,
    apply: (parts: Map<string, Part>, date: string) => Transaction,
    timestamp = this.now().toISOString(),
  ): MutationResponse {
    const before = this.state;
    const parts = structuredClone(before.parts);
    const transactionId = crypto.randomUUID();
    const { affected, counterparts } = apply(parts, timestamp.slice(0, 10));
    assertIntegrity(parts, before.dtrs);
    const changes: Change[] = [];
    const changedParts: Part[] = [];
    for (const id of affected) {
      const part = requirePart(parts, id);
      const previous = before.parts.get(id);
      part.version = (previous?.version ?? 0) + 1;
      part.operator = operator;
      changedParts.push(part);
      changes.push({
        changeId: crypto.randomUUID(),
        transactionId,
        action,
        partId: id,
        previousPart: previous ? snapshot(previous) : null,
        currentPart: snapshot(part),
        ...(counterparts?.has(id) ? { counterpartId: counterparts.get(id)! } : {}),
        date: timestamp,
        operator,
        note,
      });
    }
    const response = structuredClone({ parts: changedParts, changes, transactionId });
    this.state = { parts, dtrs: before.dtrs, changes: [...changes, ...before.changes] };
    return response;
  }

  create(value: unknown): MutationResponse {
    const input = parseCreatePart(value);
    const dtr = this.state.dtrs.get(input.dtrNo);
    if (!dtr) throw new ApiError(422, "Choose an existing DTR identification definition.");
    if ([...this.state.parts.values()].some((part) => part.serialNumber.toLowerCase() === input.serialNumber.toLowerCase())) {
      throw new ApiError(409, "That serial number already belongs to a physical part.");
    }
    return this.transact("created", input.operator, input.note, (parts) => {
      const id = `part-${crypto.randomUUID()}`;
      const { note: _note, ...fields } = input;
      parts.set(id, { ...fields, name: dtr.name, id, version: 0, subParts: {} });
      return { affected: new Set([id]) };
    });
  }

  update(id: string, value: unknown): MutationResponse {
    return this.updateValidated(id, parseUpdatePart(value));
  }

  private updateValidated(id: string, input: UpdatePartInput, timestamp?: string): MutationResponse {
    const existing = requirePart(this.state.parts, id);
    requireVersion(existing, input.expectedVersion);
    const locationChanged = !sameLocation(existing.location, input.location);
    const statusChanged = (existing.dateInstalled === null) !== (input.dateInstalled === null);
    if ((locationChanged || statusChanged) && parentReferences(this.state.parts).has(id)) {
      throw new ApiError(409, "Move the parent assembly instead; a nested part cannot have a different placement.");
    }
    if (!locationChanged && existing.revision === input.revision && existing.datecode === input.datecode
      && existing.dateInstalled === input.dateInstalled && existing.operator === input.operator) {
      // A valid no-op does not change the version, operator, or audit trail.
      return { parts: [structuredClone(existing)], changes: [], transactionId: crypto.randomUUID() };
    }
    return this.transact("updated", input.operator, input.note, (parts) => {
      const part = requirePart(parts, id);
      part.location = structuredClone(input.location);
      part.revision = input.revision;
      part.datecode = input.datecode;
      part.dateInstalled = input.dateInstalled;
      const affected = new Set([id]);
      if (locationChanged || statusChanged) {
        for (const childId of descendants(parts, id)) {
          const child = requirePart(parts, childId);
          child.location = structuredClone(input.location);
          child.dateInstalled = input.dateInstalled;
          affected.add(childId);
        }
      }
      return { affected };
    }, timestamp);
  }

  swap(value: unknown): MutationResponse {
    const input = parseSwap(value);
    if (input.partId === input.counterpartId) throw new ApiError(422, "Choose two different physical parts to swap.");
    const left = requirePart(this.state.parts, input.partId);
    const right = requirePart(this.state.parts, input.counterpartId);
    requireVersion(left, input.expectedVersion);
    requireVersion(right, input.counterpartVersion);
    if (left.dtrNo !== right.dtrNo) throw new ApiError(422, "Only parts with the same DTR number can be swapped.");
    const leftChildren = descendants(this.state.parts, left.id);
    const rightChildren = descendants(this.state.parts, right.id);
    if (leftChildren.includes(right.id) || rightChildren.includes(left.id)) {
      throw new ApiError(409, "An assembly cannot be swapped with one of its own ancestors or descendants.");
    }
    return this.transact("swapped", input.operator, input.note, (parts, date) => {
      const parents = parentReferences(parts);
      const leftParent = parents.get(left.id);
      const rightParent = parents.get(right.id);
      const affected = new Set<string>();
      const counterparts = new Map<string, string>();
      const relocate = (root: Part, children: string[], destination: Part) => {
        for (const id of [root.id, ...children]) {
          const moving = requirePart(parts, id);
          moving.location = structuredClone(destination.location);
          moving.dateInstalled = destination.dateInstalled === null ? null : date;
          affected.add(id);
          counterparts.set(id, destination.id);
        }
      };
      relocate(left, leftChildren, right);
      relocate(right, rightChildren, left);
      if (leftParent) {
        requirePart(parts, leftParent.parentId).subParts[leftParent.slot] = right.id;
        affected.add(leftParent.parentId);
        counterparts.set(leftParent.parentId, right.id);
      }
      if (rightParent) {
        requirePart(parts, rightParent.parentId).subParts[rightParent.slot] = left.id;
        affected.add(rightParent.parentId);
        counterparts.set(rightParent.parentId, left.id);
      }
      return { affected, counterparts };
    });
  }
}

export function createStore(options: StoreOptions = {}): PartStore {
  return new PartStore(options);
}
