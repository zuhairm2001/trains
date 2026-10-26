import { Elysia } from "elysia";
import { createStore, type PartStore } from "./store";
import { ApiError } from "./validation";

/** A fresh app owns a fresh in-memory mock store; importing this never opens a port. */
export function createApp(store: PartStore = createStore()) {
  return new Elysia()
    .onError(({ code, error, set }) => {
      if (error instanceof ApiError) {
        set.status = error.status;
        return { error: error.message };
      }
      if (code === "PARSE") {
        set.status = 400;
        return { error: "The request body must contain valid JSON." };
      }
      if (code === "VALIDATION") {
        set.status = 422;
        return { error: "The request does not match the required input format." };
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "The requested API route was not found." };
      }
      set.status = 500;
      return { error: "The request could not be completed. No partial transaction was saved." };
    })
    .get("/api/health", () => ({ status: "ok", storage: "memory", convex: "disconnected" }))
    .get("/api/parts", ({ query }) => store.list(query))
    .get("/api/parts/:id/eligible", ({ params }) => store.eligible(params.id))
    .get("/api/parts/:id", ({ params }) => store.detail(params.id))
    .get("/api/dtrs", () => store.dtrs())
    .get("/api/changes", () => store.changes())
    .get("/api/summary", () => store.summary())
    .post("/api/parts", ({ body, set }) => {
      const response = store.create(body);
      set.status = 201;
      return response;
    })
    .patch("/api/parts/:id", ({ params, body }) => store.update(params.id, body))
    .post("/api/swaps", ({ body }) => store.swap(body));
}
