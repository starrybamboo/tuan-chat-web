import path from "node:path";
import { defineConfig } from "vitest/config";

const workspaceRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    alias: [
      {
        find: /^api$/,
        replacement: path.resolve(__dirname, "./api/index.ts"),
      },
      {
        find: /^api\/(.*)$/,
        replacement: path.resolve(__dirname, "./api/$1"),
      },
      {
        find: /^@\//,
        replacement: `${path.resolve(__dirname, "./app")}/`,
      },
    ],
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
