import { describe, expect, it } from "vitest";

import { SPACE_ARCHIVE_ACTION_DISABLED_REASON, getSpaceArchiveActionDisabledReason } from "./spaceArchiveActionPolicy";

describe("spaceArchiveActionPolicy", () => {
  it("临时禁用未归档空间的归档入口", () => {
    expect(getSpaceArchiveActionDisabledReason({
      spaceId: 12,
      isArchived: false,
      isPending: false,
    })).toBe(SPACE_ARCHIVE_ACTION_DISABLED_REASON);
  });

  it("保留已归档空间的恢复编辑入口", () => {
    expect(getSpaceArchiveActionDisabledReason({
      spaceId: 12,
      isArchived: true,
      isPending: false,
    })).toBeNull();
  });

  it("操作中和无效空间不可用", () => {
    expect(getSpaceArchiveActionDisabledReason({
      spaceId: 12,
      isArchived: true,
      isPending: true,
    })).toBe("操作进行中");
    expect(getSpaceArchiveActionDisabledReason({
      spaceId: 0,
      isArchived: true,
      isPending: false,
    })).toBe("空间 ID 无效");
  });
});
