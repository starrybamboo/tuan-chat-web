import { shouldSelectSpaceFromSidebar } from "./chatSpaceSidebarNavigation";

describe("chatSpaceSidebarNavigation", () => {
  it("允许在发现页重新进入当前空间", () => {
    expect(shouldSelectSpaceFromSidebar({
      activeSpaceId: 12,
      targetSpaceId: 12,
      isDiscoverMode: true,
      isDragging: false,
    })).toBe(true);
  });

  it("阻止在普通聊天页重复进入当前空间", () => {
    expect(shouldSelectSpaceFromSidebar({
      activeSpaceId: 12,
      targetSpaceId: 12,
      isDiscoverMode: false,
      isDragging: false,
    })).toBe(false);
  });

  it("允许切换到其他空间", () => {
    expect(shouldSelectSpaceFromSidebar({
      activeSpaceId: 12,
      targetSpaceId: 34,
      isDiscoverMode: false,
      isDragging: false,
    })).toBe(true);
  });

  it("拖拽排序时不触发导航", () => {
    expect(shouldSelectSpaceFromSidebar({
      activeSpaceId: 12,
      targetSpaceId: 34,
      isDiscoverMode: true,
      isDragging: true,
    })).toBe(false);
  });

  it("忽略无效空间 ID", () => {
    expect(shouldSelectSpaceFromSidebar({
      activeSpaceId: 12,
      targetSpaceId: null,
      isDiscoverMode: true,
      isDragging: false,
    })).toBe(false);
  });
});
