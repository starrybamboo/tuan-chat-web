import { describe, expect, it } from "vitest";

import {
  getRoomSidebarMaterialSectionClassName,
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
        isRoomDocSectionExpanded: true,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(false);
  });

  it("频道与文档折叠时素材包展开仍保持底部锚定", () => {
    expect(
      shouldStretchRoomSidebarMaterialSection({
        hasMaterialPackages: true,
        isRoomDocSectionExpanded: false,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(false);
  });

  it("有素材包且两个分区都展开时会拉伸素材分区", () => {
    expect(
      shouldStretchRoomSidebarMaterialSection({
        hasMaterialPackages: true,
        isRoomDocSectionExpanded: true,
        isMaterialSectionExpanded: true,
      }),
    ).toBe(true);
  });

  it("频道与文档折叠时素材包展开也保留底部自动间距", () => {
    expect(
      getRoomSidebarMaterialSectionClassName({
        fillSectionClassName: "fill-section",
        isRoomDocSectionExpanded: false,
        isMaterialSectionExpanded: true,
        stretchMaterialSection: false,
      }),
    ).toBe("mt-auto");
  });

  it("两个分区都展开且素材包需要拉伸时使用填充布局", () => {
    expect(
      getRoomSidebarMaterialSectionClassName({
        fillSectionClassName: "fill-section",
        isRoomDocSectionExpanded: true,
        isMaterialSectionExpanded: true,
        stretchMaterialSection: true,
      }),
    ).toBe("fill-section");
  });
});
