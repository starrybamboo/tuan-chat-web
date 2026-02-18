import { tuanchat } from "../../../../../api/instance";

export type RealtimeRenderCloudSettings = {
  ttsApiUrl?: string;
  terrePort?: number | null;
  autoFigureEnabled?: boolean;
  coverFromRoomAvatarEnabled?: boolean;
  startupLogoFromRoomAvatarEnabled?: boolean;
  gameIconFromRoomAvatarEnabled?: boolean;
  gameNameFromRoomNameEnabled?: boolean;
  description?: string;
  packageName?: string;
  showPanicEnabled?: boolean;
  defaultLanguage?: string;
  enableAppreciation?: boolean;
  typingSoundEnabled?: boolean;
};

const SPACE_EXTRA_KEY = "webgalRealtimeRenderSettings";

function normalizeSpaceId(spaceId: number): number | null {
  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return null;
  }
  return Math.floor(spaceId);
}

function parseSettingsPayload(raw: string): RealtimeRenderCloudSettings | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as RealtimeRenderCloudSettings;
  }
  catch {
    return null;
  }
}

export async function getRealtimeRenderSettingsFromCloud(spaceId: number): Promise<RealtimeRenderCloudSettings | null> {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  if (normalizedSpaceId == null) {
    return null;
  }

  const response = await tuanchat.spaceController.getSpaceExtra(normalizedSpaceId, SPACE_EXTRA_KEY);
  if (!response?.success || typeof response.data !== "string") {
    return null;
  }

  const raw = response.data.trim();
  if (!raw) {
    return null;
  }

  return parseSettingsPayload(raw);
}

export async function setRealtimeRenderSettingsToCloud(spaceId: number, settings: RealtimeRenderCloudSettings): Promise<void> {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  if (normalizedSpaceId == null) {
    return;
  }

  await tuanchat.spaceController.setSpaceExtra({
    spaceId: normalizedSpaceId,
    key: SPACE_EXTRA_KEY,
    value: JSON.stringify(settings),
  });
}
