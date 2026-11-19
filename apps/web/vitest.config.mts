import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Each PGlite suite boots a WASM Postgres; on Windows the default
    // per-CPU fork pool runs out of memory and crashes workers.
    maxWorkers: process.platform === "win32" ? 2 : undefined,
  },
});
