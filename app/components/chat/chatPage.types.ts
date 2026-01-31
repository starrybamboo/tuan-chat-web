export type ChatPageMainView = "chat" | "spaceDetail" | "roomSetting" | "discover";
export type ChatDiscoverMode = "square" | "my";
export type RoomSettingTab = "role" | "setting";
export type SpaceDetailTab = "members" | "workflow" | "trpg" | "setting";

export type RoomSettingState = { roomId: number; tab: RoomSettingTab } | null;

export interface DocTcHeaderPayload {
  docId: string;
  entityType?: unknown;
  entityId?: number;
  header: { title: string; imageUrl: string };
}
