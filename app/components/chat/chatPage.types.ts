export type RoomSettingTab = "role" | "setting";
export type SpaceDetailTab = "members" | "roles" | "workflow" | "trpg" | "webgal" | "setting" | "material";
export type MaterialEditorActionScope = "detail" | "subwindow";
export type OpenSpaceDetailPanelOptions = {
  spacePackageId?: number | null;
  materialPathKey?: string | null;
};

export type ActiveMaterialSelection = {
  scope?: MaterialEditorActionScope | null;
  spacePackageId?: number | null;
  materialPathKey?: string | null;
};

export const SPACE_DETAIL_TABS = new Set<SpaceDetailTab>(["members", "roles", "workflow", "trpg", "webgal", "setting", "material"]);

export type RoomSettingState = { roomId: number; tab: RoomSettingTab } | null;

export type DocTcHeaderPayload = {
  docId: string;
  entityType?: unknown;
  entityId?: number;
  header: { title: string; imageUrl: string };
};
