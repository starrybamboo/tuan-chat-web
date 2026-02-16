export type RoomSettingTab = "role" | "setting";
export type SpaceDetailTab = "members" | "workflow" | "trpg" | "webgal" | "setting";

export const SPACE_DETAIL_TABS = new Set<SpaceDetailTab>(["members", "workflow", "trpg", "webgal", "setting"]);

export type RoomSettingState = { roomId: number; tab: RoomSettingTab } | null;

export type DocTcHeaderPayload = {
  docId: string;
  entityType?: unknown;
  entityId?: number;
  header: { title: string; imageUrl: string };
};
