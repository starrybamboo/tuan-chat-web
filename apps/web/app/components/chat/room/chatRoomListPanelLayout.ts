export function shouldShowRoomSidebarSplitLayout(params: {
  canViewMaterialSection: boolean;
  hasMaterialPackages: boolean;
  isRoomDocSectionExpanded: boolean;
  isMaterialSectionExpanded: boolean;
}) {
  return params.canViewMaterialSection
    && params.hasMaterialPackages
    && params.isRoomDocSectionExpanded
    && params.isMaterialSectionExpanded;
}

export function shouldStretchRoomSidebarMaterialSection(params: {
  hasMaterialPackages: boolean;
  isRoomDocSectionExpanded: boolean;
  isMaterialSectionExpanded: boolean;
}) {
  return params.hasMaterialPackages && params.isRoomDocSectionExpanded && params.isMaterialSectionExpanded;
}

export function getRoomSidebarMaterialSectionClassName(params: {
  fillSectionClassName: string;
  isRoomDocSectionExpanded: boolean;
  isMaterialSectionExpanded: boolean;
  stretchMaterialSection: boolean;
}) {
  if (params.stretchMaterialSection) {
    return params.fillSectionClassName;
  }
  // 非分栏模式下，素材包保持底部锚定，避免被上方频道区的展开状态顶上来。
  return "mt-auto";
}
