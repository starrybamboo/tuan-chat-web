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
  return !params.isRoomDocSectionExpanded || !params.isMaterialSectionExpanded ? "mt-auto" : undefined;
}
