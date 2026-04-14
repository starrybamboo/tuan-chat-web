import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.e2e.test.ts"],
    exclude: ["node_modules", "dist"],
    fileParallelism: false,
    hookTimeout: 60_000,
    minThreads: 1,
    maxThreads: 1,
    testTimeout: 30_000,
  },
});
