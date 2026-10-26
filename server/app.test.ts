import { describe, expect, test } from "bun:test";
import { emptyLocation, type MutationResponse, type Part, type PartDetail, type PartsResponse } from "../lib/contracts";
import { createApp } from "./app";
import { createStore } from "./store";

function request(path: string, method = "GET", body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}

function update(part: Part, revision: string) {
  return {
    expectedVersion: part.version,
    location: part.location,
    revision,
    datecode: part.datecode,
    dateInstalled: part.dateInstalled,
    operator: "API regression",
    note: "Competing client edit",
  };
}

describe("Elysia API contract", () => {
  test("read endpoints expose mock memory data and complete physical-part details", async () => {
    const app = createApp();
    const health = await app.handle(request("/api/health"));
    expect(await health.json()).toEqual({ status: "ok", storage: "memory", convex: "disconnected" });
    const listing = await app.handle(request("/api/parts?serialNumber=trc-2024&trainType=comeng"));
    const data = await listing.json() as PartsResponse;
    expect(listing.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.parts[0].serialNumber).toBe("TRC-2024-002");
    const detail = await (await app.handle(request(`/api/parts/${data.parts[0].id}`))).json() as PartDetail;
    expect(detail.dtr.dtrNo).toBe(detail.part.dtrNo);
    expect(detail.parents).toHaveLength(1);
    expect(detail.subParts).toHaveLength(1);
    expect(detail.changes).not.toHaveLength(0);
    const eligible = await (await app.handle(request(`/api/parts/${detail.part.id}/eligible`))).json();
    expect(eligible.parts).toHaveLength(3);
    const dtrs = await (await app.handle(request("/api/dtrs"))).json();
    expect(dtrs.dtrs).toHaveLength(8);
    const summary = await (await app.handle(request("/api/summary"))).json();
    expect(summary.totalParts).toBe(32);
    expect(summary.installedParts + summary.storedParts).toBe(32);
    const changes = await (await app.handle(request("/api/changes"))).json();
    expect(changes.changes).toHaveLength(summary.changes);
    const dates = changes.changes.map((change: { date: string }) => change.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test("validation, parsing and not-found errors are human-readable JSON without writes or stack dumps", async () => {
    const store = createStore();
    const app = createApp(store);
    const before = store.changes();
    const malformed = await app.handle(new Request("http://localhost/api/parts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }));
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "The request body must contain valid JSON." });
    for (const [path, method, body, status] of [
      ["/api/parts", "POST", {}, 422],
      ["/api/parts/part-bcu-001", "PATCH", { expectedVersion: 1, serialNumber: "CHANGE-ID" }, 422],
      ["/api/parts/missing", "GET", undefined, 404],
      ["/api/parts?datecode=not-a-number", "GET", undefined, 400],
      ["/api/parts?unknown=value", "GET", undefined, 400],
      ["/api/not-a-route", "GET", undefined, 404],
    ] as const) {
      const response = await app.handle(request(path, method, body));
      expect(response.status).toBe(status);
      const error = await response.json();
      expect(Object.keys(error)).toEqual(["error"]);
      expect(typeof error.error).toBe("string");
      expect(error.error.length).toBeGreaterThan(10);
      expect(error.error).not.toContain("server/");
      expect(error.error).not.toContain("stack");
    }
    expect(store.changes()).toEqual(before);
  });

  test("two clients with the same version yield exactly one commit and one conflict", async () => {
    const store = createStore();
    const app = createApp(store);
    const part = store.detail("part-bcu-001").part;
    const before = store.changes().changes.length;
    const responses = await Promise.all([
      app.handle(request(`/api/parts/${part.id}`, "PATCH", update(part, "F"))),
      app.handle(request(`/api/parts/${part.id}`, "PATCH", update(part, "G"))),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(store.changes().changes).toHaveLength(before + 1);
    expect(store.detail(part.id).part.version).toBe(part.version + 1);
    const rejected = responses.find((response) => response.status === 409)!;
    expect((await rejected.json()).error).toContain("Refresh");
  });

  test("create accepts integer datecodes and installation at any location dimension; swaps return a complete transaction", async () => {
    const store = createStore({ now: () => new Date("2026-10-26T12:00:00.000Z") });
    const app = createApp(store);
    const response = await app.handle(request("/api/parts", "POST", {
      serialNumber: "TRC-TEST-001",
      dtrNo: "DTR-TRC-100",
      location: { ...emptyLocation(), trainType: "Comeng", vbn: "Mock installed test fixture" },
      revision: "A",
      datecode: 7,
      dateInstalled: "2026-10-26",
      operator: "API regression",
      note: "Explicit installed status; AMC/AO need not be populated",
    }));
    expect(response.status).toBe(201);
    const created = await response.json() as MutationResponse;
    expect(created.parts[0].datecode).toBe(7);
    expect(created.changes[0].previousPart).toBeNull();
    const other = store.detail("part-trc-004").part;
    const swappedResponse = await app.handle(request("/api/swaps", "POST", {
      partId: created.parts[0].id,
      counterpartId: other.id,
      expectedVersion: created.parts[0].version,
      counterpartVersion: other.version,
      operator: "API regression",
      note: "Exchange installed standalone part with stored assembly child",
    }));
    expect(swappedResponse.status).toBe(200);
    const swapped = await swappedResponse.json() as MutationResponse;
    expect(swapped.parts).toHaveLength(4);
    expect(new Set(swapped.changes.map((change) => change.transactionId))).toEqual(new Set([swapped.transactionId]));
    expect(store.detail(created.parts[0].id).parents[0].id).toBe("part-tdu-004");
    expect(store.detail(created.parts[0].id).part.dateInstalled).toBeNull();
    expect(store.detail(other.id).parents).toEqual([]);
    expect(store.detail("part-igb-004").part.dateInstalled).toBe("2026-10-26");
  });
});
