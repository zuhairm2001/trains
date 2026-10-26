import { describe, expect, test } from "bun:test";
import { emptyLocation, locationFields, type Part, type PartSnapshot, type UpdatePartInput } from "../lib/contracts";
import { mockSeed } from "./seed";
import { createStore, type PartStore } from "./store";
import { ApiError } from "./validation";

const timestamp = "2026-10-26T10:30:00.000Z";
const makeStore = () => createStore({ now: () => new Date(timestamp) });

function edit(part: Part, overrides: Partial<UpdatePartInput> = {}): UpdatePartInput {
  return {
    expectedVersion: part.version,
    location: part.location,
    revision: part.revision,
    datecode: part.datecode,
    dateInstalled: part.dateInstalled,
    operator: "Taylor · test",
    note: "Regression transaction",
    ...overrides,
  };
}

function swapInput(left: Part, right: Part) {
  return {
    partId: left.id,
    counterpartId: right.id,
    expectedVersion: left.version,
    counterpartVersion: right.version,
    operator: "Taylor · test",
    note: "Exchange physical placements",
  };
}

function snap(part: Part): PartSnapshot {
  const { id: _id, version: _version, ...snapshot } = part;
  return snapshot;
}

function state(store: PartStore) {
  return { inventory: store.list(), history: store.changes() };
}

function rejects(status: ApiError["status"], action: () => unknown) {
  let thrown: unknown;
  try { action(); } catch (error) { thrown = error; }
  expect(thrown).toBeInstanceOf(ApiError);
  expect((thrown as ApiError).status).toBe(status);
}

describe("atomic physical-part transactions", () => {
  test("a two-sided swap records both roots, descendants and parent slots in one transaction", () => {
    const store = makeStore();
    const before = state(store);
    const left = store.detail("part-trc-001").part;
    const right = store.detail("part-trc-004").part;
    const result = store.swap(swapInput(left, right));
    const affected = ["part-trc-001", "part-igb-001", "part-trc-004", "part-igb-004", "part-tdu-001", "part-tdu-004"];
    expect(result.parts.map((part) => part.id).sort()).toEqual([...affected].sort());
    expect(result.changes).toHaveLength(6);
    expect(new Set(result.changes.map((change) => change.transactionId))).toEqual(new Set([result.transactionId]));
    for (const change of result.changes) {
      const previous = before.inventory.parts.find((part) => part.id === change.partId)!;
      const current = store.detail(change.partId).part;
      expect(change.previousPart).toEqual(snap(previous));
      expect(change.currentPart).toEqual(snap(current));
      expect(change.counterpartId).toBeTruthy();
      expect(change.action).toBe("swapped");
      expect(change.date).toBe(timestamp);
      expect(current.version).toBe(previous.version + 1);
      expect(current.serialNumber).toBe(previous.serialNumber);
      expect(current.revision).toBe(previous.revision);
      expect(current.datecode).toBe(previous.datecode);
    }
    expect(store.detail(left.id).part.location).toEqual(right.location);
    expect(store.detail(left.id).part.dateInstalled).toBeNull();
    expect(store.detail("part-igb-001").part.dateInstalled).toBeNull();
    expect(store.detail(right.id).part.location).toEqual(left.location);
    expect(store.detail(right.id).part.dateInstalled).toBe("2026-10-26");
    expect(store.detail("part-igb-004").part.dateInstalled).toBe("2026-10-26");
    expect(store.detail("part-igb-004").part.location).toEqual(left.location);
    expect(store.detail("part-tdu-001").part.subParts.converter).toBe(right.id);
    expect(store.detail("part-tdu-004").part.subParts.converter).toBe(left.id);
    expect(store.detail(left.id).part.subParts).toEqual(left.subParts);
    expect(store.detail(right.id).part.subParts).toEqual(right.subParts);
    expect(store.detail(right.id).parents[0].id).toBe("part-tdu-001");
    expect(store.changes().changes).toHaveLength(before.history.changes.length + 6);
    for (const old of before.history.changes) {
      expect(store.changes().changes.find((change) => change.changeId === old.changeId)).toEqual(old);
    }
  });

  test("stale clients cannot edit or swap after another client commits; neither failure writes", () => {
    const store = makeStore();
    const original = store.detail("part-bcu-001").part;
    const other = store.detail("part-bcu-002").part;
    store.update(original.id, edit(original, { revision: "F" }));
    const committed = state(store);
    rejects(409, () => store.update(original.id, edit(original, { revision: "G" })));
    expect(state(store)).toEqual(committed);
    rejects(409, () => store.swap(swapInput(original, other)));
    expect(state(store)).toEqual(committed);
    rejects(409, () => store.swap(swapInput(other, original)));
    expect(state(store)).toEqual(committed);
  });

  test("DTR mismatch and self-swaps are rejected without history or version changes", () => {
    const store = makeStore();
    const before = state(store);
    const left = store.detail("part-bcu-001").part;
    const right = store.detail("part-dcu-001").part;
    rejects(422, () => store.swap(swapInput(left, right)));
    rejects(422, () => store.swap(swapInput(left, left)));
    expect(state(store)).toEqual(before);
    expect(store.eligible(left.id).parts).toHaveLength(3);
    expect(store.eligible(left.id).parts.every((part) => part.dtrNo === left.dtrNo && part.id !== left.id)).toBe(true);
  });

  test("create, edit and swap preserve identity and a continuous snapshot history", () => {
    const store = makeStore();
    const created = store.create({
      serialNumber: "BCU-2026-NEW",
      dtrNo: "DTR-BCU-100",
      location: { ...emptyLocation(), trainType: "Comeng", localStorage: "Bench 4" },
      revision: "A",
      datecode: 42,
      dateInstalled: null,
      operator: "Taylor · test",
      note: "New physical spare",
    }).parts[0];
    const updated = store.update(created.id, edit(created, { revision: "B", datecode: 43 })).parts[0];
    const existing = store.detail("part-bcu-001").part;
    store.swap(swapInput(updated, existing));
    const final = store.detail(created.id);
    expect(final.part.id).toBe(created.id);
    expect(final.part.serialNumber).toBe("BCU-2026-NEW");
    expect(final.part.revision).toBe("B");
    expect(final.part.datecode).toBe(43);
    expect(final.part.version).toBe(3);
    const history = [...final.changes].reverse();
    expect(history.map((change) => change.action)).toEqual(["created", "updated", "swapped"]);
    expect(history[0].previousPart).toBeNull();
    expect(history[1].previousPart).toEqual(history[0].currentPart);
    expect(history[2].previousPart).toEqual(history[1].currentPart);
    expect(history[2].currentPart).toEqual(snap(final.part));
    expect(history.every((change) => change.currentPart.serialNumber === created.serialNumber)).toBe(true);
  });

  test("invalid mutation inputs and duplicate serials cannot append history", () => {
    const store = makeStore();
    const part = store.detail("part-bcu-001").part;
    const before = state(store);
    const input = edit(part, { revision: "F" });
    for (const invalid of [
      { ...input, serialNumber: "REPLACED-IDENTITY" },
      { ...input, subParts: { bad: "missing" } },
      { ...input, expectedVersion: "1" },
      { ...input, datecode: 1.5 },
      { ...input, dateInstalled: "2026-02-30" },
      { ...input, operator: "   " },
      { ...input, location: { ...part.location, inventedField: "invalid" } },
      { ...input, location: { trainType: "Comeng" } },
    ]) rejects(422, () => store.update(part.id, invalid));
    const { expectedVersion: _version, ...createFields } = input;
    rejects(409, () => store.create({ ...createFields, dtrNo: part.dtrNo, serialNumber: part.serialNumber.toLowerCase() }));
    rejects(422, () => store.create({ ...createFields, dtrNo: "DTR-MISSING", serialNumber: "NEW-001" }));
    expect(state(store)).toEqual(before);
  });

  test("operator-only edits persist in place with a before/after audit record", () => {
    const store = makeStore();
    const part = store.detail("part-bcu-001").part;
    const response = store.update(part.id, edit(part, { operator: "New maintainer" }));
    const current = store.detail(part.id);
    expect(current.part.id).toBe(part.id);
    expect(current.part.serialNumber).toBe(part.serialNumber);
    expect(current.part.operator).toBe("New maintainer");
    expect(current.part.version).toBe(part.version + 1);
    expect(response.changes[0].previousPart?.operator).toBe(part.operator);
    expect(response.changes[0].currentPart.operator).toBe("New maintainer");
    expect(current.changes[0].transactionId).toBe(response.transactionId);
  });
});

describe("normalized assembly integrity", () => {
  test("moving a root propagates placement and status to all levels, while nested divergence is rejected", () => {
    const store = makeStore();
    const parent = store.detail("part-tdu-001").part;
    const storage = { ...emptyLocation(), trainType: "X'Trapolis 100", vbn: "Test warehouse" };
    const moved = store.update(parent.id, edit(parent, { location: storage, dateInstalled: null }));
    expect(moved.parts).toHaveLength(4);
    for (const id of ["part-tdu-001", "part-trc-001", "part-tmo-001", "part-igb-001"]) {
      expect(store.detail(id).part.location).toEqual(storage);
      expect(store.detail(id).part.dateInstalled).toBeNull();
    }
    const child = store.detail("part-trc-001").part;
    const before = state(store);
    rejects(409, () => store.update(child.id, edit(child, { location: { ...storage, vbn: "Elsewhere" } })));
    rejects(409, () => store.update(child.id, edit(child, { dateInstalled: "2026-10-26" })));
    expect(state(store)).toEqual(before);
    const revisionEdit = store.update(child.id, edit(child, { revision: "F" }));
    expect(revisionEdit.parts).toHaveLength(1);
    expect(store.detail(child.id).parents[0].id).toBe(parent.id);
  });

  test("swapping complete assemblies moves their physical descendant trees without changing references", () => {
    const store = makeStore();
    const left = store.detail("part-tdu-001").part;
    const right = store.detail("part-tdu-003").part;
    const before = store.list().parts;
    const result = store.swap(swapInput(left, right));
    expect(result.parts).toHaveLength(8);
    for (const suffix of ["001", "003"]) {
      const destination = suffix === "001" ? right : left;
      for (const code of ["tdu", "trc", "tmo", "igb"]) {
        const id = `part-${code}-${suffix}`;
        const current = store.detail(id).part;
        const previous = before.find((part) => part.id === id)!;
        expect(current.location).toEqual(destination.location);
        expect(current.dateInstalled).toBe("2026-10-26");
        expect(current.subParts).toEqual(previous.subParts);
        expect(current.serialNumber).toBe(previous.serialNumber);
        expect(current.revision).toBe(previous.revision);
        expect(current.datecode).toBe(previous.datecode);
      }
    }
  });

  test("two children of one parent exchange slots with exactly one parent version/history change", () => {
    const initialData = mockSeed();
    const motor = initialData.parts.find((part) => part.id === "part-tmo-001")!;
    const converter = initialData.parts.find((part) => part.id === "part-trc-001")!;
    motor.dtrNo = converter.dtrNo;
    motor.name = converter.name;
    const store = createStore({ initialData, now: () => new Date(timestamp) });
    const parent = store.detail("part-tdu-001").part;
    const response = store.swap(swapInput(converter, motor));
    const updated = store.detail(parent.id).part;
    expect(updated.subParts).toEqual({ converter: motor.id, motor: converter.id });
    expect(updated.version).toBe(parent.version + 1);
    expect(response.changes.filter((change) => change.partId === parent.id)).toHaveLength(1);
    expect(store.detail("part-igb-001").parents[0].id).toBe(converter.id);
  });

  test("same-DTR direct and indirect ancestor swaps are excluded and rejected atomically", () => {
    const initialData = mockSeed();
    const root = initialData.parts.find((part) => part.id === "part-tdu-001")!;
    for (const id of ["part-trc-001", "part-igb-001"]) {
      const part = initialData.parts.find((candidate) => candidate.id === id)!;
      part.dtrNo = root.dtrNo;
      part.name = root.name;
    }
    const store = createStore({ initialData });
    const before = state(store);
    for (const id of ["part-trc-001", "part-igb-001"]) {
      const descendant = store.detail(id).part;
      expect(store.eligible(root.id).parts.some((part) => part.id === id)).toBe(false);
      expect(store.eligible(id).parts.some((part) => part.id === root.id)).toBe(false);
      rejects(409, () => store.swap(swapInput(root, descendant)));
      rejects(409, () => store.swap(swapInput(descendant, root)));
    }
    expect(state(store)).toEqual(before);
  });

  test("initial data cannot contain dangling children, duplicate parents, or cycles", () => {
    const dangling = mockSeed();
    dangling.parts[0].subParts.missing = "does-not-exist";
    rejects(422, () => createStore({ initialData: dangling }));
    const multipleParents = mockSeed();
    multipleParents.parts[1].subParts.duplicate = "part-trc-001";
    rejects(422, () => createStore({ initialData: multipleParents }));
    const cycle = mockSeed();
    cycle.parts.find((part) => part.id === "part-igb-001")!.subParts.back = "part-tdu-001";
    rejects(409, () => createStore({ initialData: cycle }));
  });
});

describe("detached inventory reads", () => {
  test("mutating lists, detail, DTRs, history and mutation responses cannot alter stored state", () => {
    const store = makeStore();
    const before = state(store);
    const listing = store.list();
    listing.parts[0].location.amc = "EXTERNAL";
    listing.parts[0].subParts.injected = "invalid";
    const detail = store.detail("part-trc-001");
    detail.part.location.amc = "EXTERNAL";
    detail.dtr.name = "EXTERNAL";
    detail.subParts[0].serialNumber = "EXTERNAL";
    detail.parents[0].subParts.injected = "invalid";
    detail.changes[0].currentPart.location.amc = "EXTERNAL";
    store.dtrs().dtrs[0].name = "EXTERNAL";
    store.changes().changes[0].currentPart.serialNumber = "EXTERNAL";
    store.eligible("part-trc-001").parts[0].revision = "EXTERNAL";
    expect(state(store)).toEqual(before);
    const part = store.detail("part-bcu-001").part;
    const mutation = store.update(part.id, edit(part, { revision: "Z" }));
    const committed = state(store);
    mutation.parts[0].location.amc = "EXTERNAL";
    mutation.changes[0].currentPart.location.amc = "EXTERNAL";
    mutation.changes[0].previousPart!.serialNumber = "EXTERNAL";
    expect(state(store)).toEqual(committed);
  });

  test("every location dimension supports case-insensitive substring filtering and datecode is exact", () => {
    const store = makeStore();
    const parts = store.list().parts;
    expect(parts).toHaveLength(32);
    for (const field of locationFields) {
      const example = parts.find((part) => part.location[field])!;
      expect(example).toBeDefined();
      const value = example.location[field].toUpperCase();
      const results = store.list({ [field]: value }).parts;
      expect(results.some((part) => part.id === example.id)).toBe(true);
      expect(results.every((part) => part.location[field].toUpperCase().includes(value))).toBe(true);
    }
    const sample = parts[0];
    expect(store.list({ serialNumber: sample.serialNumber.toLowerCase().slice(0, 8) }).parts.some((part) => part.id === sample.id)).toBe(true);
    expect(store.list({ dtrNo: "trc" }).parts.every((part) => part.dtrNo.includes("TRC"))).toBe(true);
    expect(store.list({ datecode: String(sample.datecode) }).parts.every((part) => part.datecode === sample.datecode)).toBe(true);
    expect(store.list({ datecode: String(sample.datecode).slice(0, 4) }).total).toBe(0);
    expect(store.list({ q: "power module" }).parts.every((part) => part.name === "IGBT power module")).toBe(true);
    rejects(400, () => store.list({ datecode: "NaN" }));
  });
});
