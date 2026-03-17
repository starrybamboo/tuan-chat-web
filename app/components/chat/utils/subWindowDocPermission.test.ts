import { describe, expect, it } from "vitest";

import { checkIsKpInSpaceMembers, resolveSubWindowDocPermission } from "@/components/chat/utils/subWindowDocPermission";

describe("checkIsKpInSpaceMembers", () => {
  it("returns true when user is kp in member list", () => {
    const result = checkIsKpInSpaceMembers([
      { userId: 1001, memberType: 3 },
      { userId: 42, memberType: 1 },
    ], 42);

    expect(result).toBe(true);
  });

  it("returns true when user is assistant leader in member list", () => {
    const result = checkIsKpInSpaceMembers([
      { userId: 42, memberType: 5 },
    ], 42);

    expect(result).toBe(true);
  });

  it("returns false when user is not kp in member list", () => {
    const result = checkIsKpInSpaceMembers([
      { userId: 42, memberType: 3 },
    ], 42);

    expect(result).toBe(false);
  });
});

describe("resolveSubWindowDocPermission", () => {
  it("keeps permission true while member permission is unresolved and cache says kp", () => {
    const result = resolveSubWindowDocPermission({
      isKpInMembers: false,
      isSpaceOwner: false,
      isMemberPermissionResolved: false,
      cachedIsKp: true,
    });

    expect(result).toBe(true);
  });

  it("returns false after member permission is resolved as non-kp", () => {
    const result = resolveSubWindowDocPermission({
      isKpInMembers: false,
      isSpaceOwner: false,
      isMemberPermissionResolved: true,
      cachedIsKp: true,
    });

    expect(result).toBe(false);
  });
});
