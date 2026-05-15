import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@tuanchat\/openapi-client$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-openapi-client/src/index.ts"),
      },
      {
        find: /^@tuanchat\/openapi-client\/(.*)$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-openapi-client/src/$1"),
      },
      {
        find: /^@tuanchat\/query$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-query/src/index.ts"),
      },
      {
        find: /^@tuanchat\/query\/(.*)$/,
        replacement: path.resolve(__dirname, "./packages/tuanchat-query/src/$1"),
      },
      {
        find: /^api$/,
        replacement: path.resolve(__dirname, "./api/index.ts"),
      },
      {
        find: /^api\/(.*)$/,
        replacement: path.resolve(__dirname, "./api/$1"),
      },
      {
        find: /^app\/(.*)$/,
        replacement: path.resolve(__dirname, "./app/$1"),
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
    include: ["**/*.test.ts"],
    exclude: ["**/*.e2e.test.ts", "node_modules", "dist"],
    maxWorkers: 16,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov"],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
