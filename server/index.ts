import { createApp } from "./app";

export { createApp } from "./app";
export { createStore, PartStore } from "./store";

if (import.meta.main) {
  const port = Number(process.env.API_PORT || 3001);
  createApp().listen({ hostname: "0.0.0.0", port });
  console.info(`Mock parts API listening on 0.0.0.0:${port}; storage=memory, Convex=disconnected`);
}
