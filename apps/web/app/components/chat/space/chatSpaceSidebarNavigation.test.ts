import { describe, expect, it } from "vitest";

import { shouldSelectSpaceFromSidebar, shouldShowSpaceAsActive } from "./chatSpaceSidebarNavigation";

describe("chatSpaceSidebarNavigation", () => {
  describe("shouldSelectSpaceFromSidebar", () => {
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

  describe("shouldShowSpaceAsActive", () => {
    it("私聊模式下不保留空间选中态", () => {
      expect(shouldShowSpaceAsActive({
        activeSpaceId: 7,
        spaceId: 7,
        isPrivateChatMode: true,
      })).toBe(false);
    });

    it("发现页不保留空间选中态", () => {
      expect(shouldShowSpaceAsActive({
        activeSpaceId: 7,
        spaceId: 7,
        isDiscoverMode: true,
      })).toBe(false);
    });

    it("普通聊天页只高亮当前空间", () => {
      expect(shouldShowSpaceAsActive({
        activeSpaceId: 7,
        spaceId: 7,
      })).toBe(true);
    });
  });
});
