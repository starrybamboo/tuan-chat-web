import type { QueryClient } from "@tanstack/react-query";

import {
  fetchSpaceExtraWithCache,
  setSpaceExtraWithCache,
} from "../../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../../api/instance";

export type RealtimeRenderCloudSettings = {
  ttsApiUrl?: string;
  terrePort?: number | null;
  autoFigureEnabled?: boolean;
  roomContentAlertThreshold?: number;
  baseTemplate?: string;
  coverFromRoomAvatarEnabled?: boolean;
  titleImageUrl?: string;
  titleImageFileId?: number;
  originalTitleImageUrl?: string;
  originalTitleImageFileId?: number;
  startupLogoFromRoomAvatarEnabled?: boolean;
  startupLogoUrl?: string;
  startupLogoFileId?: number;
  originalStartupLogoUrl?: string;
  originalStartupLogoFileId?: number;
  gameIconFromRoomAvatarEnabled?: boolean;
  gameNameFromRoomNameEnabled?: boolean;
  description?: string;
  packageName?: string;
  showPanicEnabled?: boolean;
  allowOpenFullSettings?: boolean;
  speakerFocusEnabled?: boolean;
  defaultLanguage?: string;
  enableAppreciation?: boolean;
  typingSoundEnabled?: boolean;
  typingSoundInterval?: number;
  typingSoundPunctuationPause?: number;
  typingSoundSeUrl?: string;
  typingSoundSeFileId?: number;
  typingSoundSeMediaType?: string;
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

export async function getRealtimeRenderSettingsFromCloud(spaceId: number, queryClient?: QueryClient | null): Promise<RealtimeRenderCloudSettings | null> {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  if (normalizedSpaceId == null) {
    return null;
  }

  const response = queryClient
    ? await fetchSpaceExtraWithCache(queryClient, normalizedSpaceId, SPACE_EXTRA_KEY)
    : await tuanchat.spaceController.getSpaceExtra(normalizedSpaceId, SPACE_EXTRA_KEY);
  if (!response?.success || typeof response.data !== "string") {
    return null;
  }

  const raw = response.data.trim();
  if (!raw) {
    return null;
  }

  return parseSettingsPayload(raw);
}

export async function setRealtimeRenderSettingsToCloud(spaceId: number, settings: RealtimeRenderCloudSettings, queryClient?: QueryClient | null): Promise<void> {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  if (normalizedSpaceId == null) {
    return;
  }

  const request = {
    spaceId: normalizedSpaceId,
    key: SPACE_EXTRA_KEY,
    value: JSON.stringify(settings),
  };

  if (queryClient) {
    await setSpaceExtraWithCache(queryClient, request);
    return;
  }

  await tuanchat.spaceController.setSpaceExtra(request);
}
