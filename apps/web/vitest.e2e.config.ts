import path from "node:path";
import { defineConfig } from "vitest/config";

import { getWebAliasEntries } from "./tooling/alias-config";

const workspaceRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    alias: getWebAliasEntries(__dirname),
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.e2e.test.ts"],
    exclude: ["node_modules", "dist"],
    fileParallelism: false,
    hookTimeout: 60_000,
    maxWorkers: 1,
    testTimeout: 30_000,
    server: {
    },
  },
});
