import { afterEach, describe, expect, it, vi } from "vitest";

const sqliteMocks = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
}));

vi.mock("expo-sqlite", () => sqliteMocks);
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import { getMobileLocalDbDriver, resetMobileLocalDbForTests } from "./mobile-local-db";

describe("mobile local db transaction queue", () => {
  afterEach(() => {
    resetMobileLocalDbForTests();
    vi.clearAllMocks();
  });

  it("普通写入等待独占事务提交后再执行", async () => {
    const calls: string[] = [];
    const transactionDb = {
      execAsync: vi.fn(async (sql: string) => {
        calls.push(`transaction:${sql}`);
      }),
      getAllAsync: vi.fn(async () => []),
      runAsync: vi.fn(async (sql: string) => {
        calls.push(`transaction:${sql}`);
      }),
    };
    const db = {
      execAsync: vi.fn(async (sql: string) => {
        calls.push(`root:${sql}`);
      }),
      getAllAsync: vi.fn(async () => []),
      runAsync: vi.fn(async (sql: string) => {
        calls.push(`root:${sql}`);
      }),
      withExclusiveTransactionAsync: vi.fn(async (task: (transaction: typeof transactionDb) => Promise<void>) => {
        calls.push("transaction:begin");
        await task(transactionDb);
        calls.push("transaction:commit");
      }),
    };
    sqliteMocks.openDatabaseAsync.mockResolvedValue(db);

    let releaseTransaction!: () => void;
    let markTransactionStarted!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });
    const transactionStarted = new Promise<void>((resolve) => {
      markTransactionStarted = resolve;
    });
    const driver = await getMobileLocalDbDriver();
    const transactionPromise = driver.transaction!(async (transactionDriver) => {
      await transactionDriver.run("inside");
      markTransactionStarted();
      await transactionGate;
    });

    await transactionStarted;
    const outsideWritePromise = driver.run("outside");
    await Promise.resolve();

    expect(calls).toEqual(["transaction:begin", "transaction:inside"]);

    releaseTransaction();
    await Promise.all([transactionPromise, outsideWritePromise]);

    expect(calls).toEqual([
      "transaction:begin",
      "transaction:inside",
      "transaction:commit",
      "root:outside",
    ]);
  });
});
