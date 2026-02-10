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
    maxThreads: 16,
  },
});
