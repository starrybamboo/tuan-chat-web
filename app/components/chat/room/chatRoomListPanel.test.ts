import { describe, expect, it } from "vitest";

import {
  shouldShowRoomSidebarSplitLayout,
  shouldStretchRoomSidebarMaterialSection,
} from "./chatRoomListPanel";

describe("chatRoomListPanel layout guards", () => {
  it("空素材包时不会启用上下分栏", () => {
    expect(
      shouldShowRoomSidebarSplitLayout({
        canViewMaterialSection: true,
        hasMaterialPackages: false,
        isRoomDocSectionExpanded: true,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(false);
  });

  it("有素材包且两个分区都展开时启用上下分栏", () => {
    expect(
      shouldShowRoomSidebarSplitLayout({
        canViewMaterialSection: true,
        hasMaterialPackages: true,
        isRoomDocSectionExpanded: true,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(true);
  });

  it("空素材包展开时不会拉伸素材分区", () => {
    expect(
      shouldStretchRoomSidebarMaterialSection({
        hasMaterialPackages: false,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(false);
  });

  it("有素材包且分区展开时会拉伸素材分区", () => {
    expect(
      shouldStretchRoomSidebarMaterialSection({
        hasMaterialPackages: true,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(true);
  });
});
