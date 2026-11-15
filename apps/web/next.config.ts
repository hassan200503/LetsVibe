import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The web app lives inside a pnpm workspace; the lockfile and packages sit
  // two levels up, so Turbopack must treat the repo root as its root.
  turbopack: { root: path.resolve(process.cwd(), "../..") },
  transpilePackages: ["@letsvibe/domain"],
  // PGlite ships WASM and data files that must be loaded from node_modules, not bundled;
  // web-push relies on Node's crypto and https modules, so it runs as-is from node_modules too.
  serverExternalPackages: ["@electric-sql/pglite", "web-push"],
  // The migrations are read from disk at runtime when a server finds its database behind
  // (see withSchema in src/lib/db/client.ts), so every function carries them.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/*.sql", "./drizzle/meta/_journal.json"],
  },
};

export default nextConfig;
