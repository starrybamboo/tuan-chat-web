import { describe, expect, it, vi } from "vitest";

import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  createMobileQuerySnapshotWriteInput,
  createMobileQuerySnapshotWriteSignature,
  getSnapshotHydratedData,
  isRestoredFromMobileSnapshot,
  isSnapshotBackedLoading,
  isSnapshotBackedPending,
  shouldSkipMobileQuerySnapshotWrite,
  shouldWriteMobileQuerySnapshot,
  stableStringifyMobileQueryKey,
} from "./use-mobile-query-snapshot";

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

vi.mock("./mobile-query-snapshot-cache", () => ({
  readMobileQuerySnapshot: vi.fn(),
  writeMobileQuerySnapshot: vi.fn(),
}));

describe("mobile query snapshot helpers", () => {
  it("stableStringifyMobileQueryKey sorts object keys recursively", () => {
    expect(stableStringifyMobileQueryKey(["rooms", { b: 2, a: { z: 1, y: 2 } }]))
      .toBe(stableStringifyMobileQueryKey(["rooms", { a: { y: 2, z: 1 }, b: 2 }]));
    expect(createMobileQuerySnapshotKey(["rooms", { spaceId: 7 }])).toBe("[\"rooms\",{\"spaceId\":7}]");
  });

  it("hydrates from snapshot while network data is unavailable", () => {
    const snapshot = {
      entry: {
        expiresAt: null,
        key: "friends",
        payload: ["cached"],
        scope: "friends",
        updatedAt: 1,
        userId: 7,
      },
      key: "friends",
    };

    expect(getSnapshotHydratedData(undefined, snapshot, "friends", false)).toEqual(["cached"]);
    expect(getSnapshotHydratedData([], snapshot, "friends", false)).toEqual(["cached"]);
  });

  it("keeps successful network data authoritative over snapshot", () => {
    const snapshot = {
      entry: {
        expiresAt: null,
        key: "friends",
        payload: ["cached"],
        scope: "friends",
        updatedAt: 1,
        userId: 7,
      },
      key: "friends",
    };

    expect(getSnapshotHydratedData(["network"], snapshot, "friends", true)).toEqual(["network"]);
  });

  it("marks pending and loading false when snapshot data is available", () => {
    const query = { isLoading: true, isPending: true };

    expect(isSnapshotBackedPending(query, ["cached"])).toBe(false);
    expect(isSnapshotBackedLoading(query, ["cached"])).toBe(false);
    expect(isSnapshotBackedPending(query, undefined)).toBe(true);
    expect(isSnapshotBackedLoading(query, undefined)).toBe(true);
  });

  it("reports snapshot restoration only before network success", () => {
    expect(isRestoredFromMobileSnapshot(undefined, ["cached"], false)).toBe(true);
    expect(isRestoredFromMobileSnapshot([], ["cached"], false)).toBe(true);
    expect(isRestoredFromMobileSnapshot(["network"], ["network"], true)).toBe(false);
  });

  it("writes only enabled successful queries with data", () => {
    expect(shouldWriteMobileQuerySnapshot({ data: ["ok"], isSuccess: true }, true)).toBe(true);
    expect(shouldWriteMobileQuerySnapshot({ data: ["ok"], isSuccess: true }, false)).toBe(false);
    expect(shouldWriteMobileQuerySnapshot({ data: undefined, isSuccess: true }, true)).toBe(false);
    expect(shouldWriteMobileQuerySnapshot({ data: ["ok"], isSuccess: false }, true)).toBe(false);
  });

  it("creates write input with prepared payload and scope", () => {
    expect(createMobileQuerySnapshotWriteInput([1, 2, 3], {
      key: "notifications",
      preparePayload: data => data.slice(0, 2),
      scope: "notifications-first-page",
      ttlMs: 120_000,
      userId: 7,
    })).toEqual({
      key: "notifications",
      payload: [1, 2],
      scope: "notifications-first-page",
      ttlMs: 120_000,
      userId: 7,
    });
  });

  it("creates stable write signatures from equivalent payloads", () => {
    const first = createMobileQuerySnapshotWriteSignature({
      key: "rules",
      payload: [{ id: 1, meta: { b: 2, a: 1 } }],
      scope: "rule-page",
      ttlMs: 120_000,
      userId: 7,
    });
    const second = createMobileQuerySnapshotWriteSignature({
      key: "rules",
      payload: [{ id: 1, meta: { a: 1, b: 2 } }],
      scope: "rule-page",
      ttlMs: 120_000,
      userId: 7,
    });
    const changed = createMobileQuerySnapshotWriteSignature({
      key: "rules",
      payload: [{ id: 2, meta: { a: 1, b: 2 } }],
      scope: "rule-page",
      ttlMs: 120_000,
      userId: 7,
    });

    expect(first).toBe(second);
    expect(first).not.toBe(changed);
  });

  it("dedupes identical snapshot writes only within the configured window", () => {
    const state = {
      completedAt: 1_000,
      completedSignature: "same",
      pendingSignature: null,
    };

    expect(shouldSkipMobileQuerySnapshotWrite(state, "same", 30_000, 60_000)).toBe(true);
    expect(shouldSkipMobileQuerySnapshotWrite(state, "same", 62_000, 60_000)).toBe(false);
    expect(shouldSkipMobileQuerySnapshotWrite({
      completedAt: null,
      completedSignature: null,
      pendingSignature: "same",
    }, "same", 30_000, 60_000)).toBe(true);
    expect(shouldSkipMobileQuerySnapshotWrite(state, "changed", 30_000, 60_000)).toBe(false);
  });

  it("guards user scoped snapshots by auth state and positive user id", () => {
    expect(canUseMobileUserScopedSnapshot({ isAuthenticated: true, userId: 7 })).toBe(true);
    expect(canUseMobileUserScopedSnapshot({ enabled: false, isAuthenticated: true, userId: 7 })).toBe(false);
    expect(canUseMobileUserScopedSnapshot({ isAuthenticated: false, userId: 7 })).toBe(false);
    expect(canUseMobileUserScopedSnapshot({ isAuthenticated: true, userId: 0 })).toBe(false);
    expect(canUseMobileUserScopedSnapshot({ isAuthenticated: true, userId: null })).toBe(false);
  });
});
