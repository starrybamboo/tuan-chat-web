import { describe, expect, it } from "vitest";

import {
  getChatSidebarActiveCursorTarget,
  isChatSidebarSpaceCursorTarget,
  shouldSelectSpaceFromSidebar,
  shouldShowSpaceAsActive,
} from "./chatSpaceSidebarNavigation";

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

  describe("getChatSidebarActiveCursorTarget", () => {
    it("私聊模式下光标归属私信入口", () => {
      expect(getChatSidebarActiveCursorTarget({
        activeSpaceId: 7,
        isPrivateChatMode: true,
      })).toEqual({ type: "private" });
    });

    it("发现页光标归属发现入口", () => {
      expect(getChatSidebarActiveCursorTarget({
        activeSpaceId: 7,
        isDiscoverMode: true,
      })).toEqual({ type: "discover" });
    });

    it("普通聊天页光标归属当前空间", () => {
      expect(getChatSidebarActiveCursorTarget({
        activeSpaceId: 7,
      })).toEqual({ type: "space", spaceId: 7 });
    });

    it("没有有效当前空间时不显示光标", () => {
      expect(getChatSidebarActiveCursorTarget({
        activeSpaceId: null,
      })).toBeNull();
    });
  });

  describe("isChatSidebarSpaceCursorTarget", () => {
    it("只匹配光标归属的空间", () => {
      const target = getChatSidebarActiveCursorTarget({ activeSpaceId: 7 });

      expect(isChatSidebarSpaceCursorTarget(target, 7)).toBe(true);
      expect(isChatSidebarSpaceCursorTarget(target, 8)).toBe(false);
    });

    it("私信和发现光标不会匹配空间", () => {
      expect(isChatSidebarSpaceCursorTarget({ type: "private" }, 7)).toBe(false);
      expect(isChatSidebarSpaceCursorTarget({ type: "discover" }, 7)).toBe(false);
    });
  });
});
