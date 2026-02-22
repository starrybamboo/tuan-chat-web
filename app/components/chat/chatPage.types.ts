export type RoomSettingTab = "role" | "setting";
export type SpaceDetailTab = "members" | "roles" | "workflow" | "trpg" | "webgal" | "setting";

export const SPACE_DETAIL_TABS = new Set<SpaceDetailTab>(["members", "roles", "workflow", "trpg", "webgal", "setting"]);

export type RoomSettingState = { roomId: number; tab: RoomSettingTab } | null;

export type DocTcHeaderPayload = {
  docId: string;
  entityType?: unknown;
  entityId?: number;
  header: { title: string; imageUrl: string };
};
