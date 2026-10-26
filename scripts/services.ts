export function runServices(mode: "dev" | "start") {
  const api = Bun.spawn(["bun", "run", `${mode}:api`], { stdout: "inherit", stderr: "inherit" });
  const web = Bun.spawn(["bun", "run", `${mode}:web`], { stdout: "inherit", stderr: "inherit" });
  let stopping = false;
  function stop(code: number) {
    if (stopping) return;
    stopping = true;
    api.kill("SIGTERM");
    web.kill("SIGTERM");
    void Promise.all([api.exited, web.exited]).then(() => process.exit(code));
  }
  process.on("SIGINT", () => stop(0));
  process.on("SIGTERM", () => stop(0));
  void api.exited.then((code) => stop(code || 1));
  void web.exited.then((code) => stop(code || 1));
}
