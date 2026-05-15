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
