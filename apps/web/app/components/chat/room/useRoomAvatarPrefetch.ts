import type { QueryClient } from "@tanstack/react-query";

import { fetchClientMetadataBatchWithCache } from "@tuanchat/query/metadata";
import { useEffect, useMemo, useRef } from "react";

import { imageLowUrl } from "@/utils/media/mediaUrl";
import { scheduleNonCriticalTask } from "@/utils/scheduleNonCriticalTask";

import type { ChatMessageResponse } from "../../../../api";

import { tuanchat } from "../../../../api/instance";

const ROOM_AVATAR_PREFETCH_BATCH_SIZE = 3;
const ROOM_AVATAR_PREFETCH_RECENT_INTERACTION_QUIET_MS = 900;
const ROOM_AVATAR_PREFETCH_DELAY_MS = 900;
const ROOM_AVATAR_PREFETCH_IDLE_TIMEOUT_MS = 2500;

type RoomAvatarPrefetchRole = {
  avatarId?: number | null;
  avatarFileId?: number | null;
};

type RoomAvatarPrefetchMessage = Pick<ChatMessageResponse, "message">;

type BrowserConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type BrowserNavigatorLike = {
  connection?: BrowserConnectionLike;
};

type RoomAvatarPrefetchRuntime = {
  document?: Pick<Document, "visibilityState">;
  Image?: typeof Image;
  navigator?: BrowserNavigatorLike;
  now?: () => number;
};

type PrefetchAvatarImageUrl = (url: string, runtime?: RoomAvatarPrefetchRuntime) => Promise<void>;

export type RoomAvatarPrefetchOptions = {
  queryClient: QueryClient;
  messages: readonly RoomAvatarPrefetchMessage[];
  roles?: readonly RoomAvatarPrefetchRole[];
  interactionVersion?: number;
  enabled?: boolean;
  runtime?: RoomAvatarPrefetchRuntime;
  prefetchAvatarImageUrl?: PrefetchAvatarImageUrl;
};

function getPositiveId(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getMessagePosition(message: RoomAvatarPrefetchMessage): number {
  const position = message.message?.position;
  return typeof position === "number" && Number.isFinite(position) ? position : Number.NEGATIVE_INFINITY;
}

export function collectRoomAvatarPrefetchIds(params: {
  messages: readonly RoomAvatarPrefetchMessage[];
  roles?: readonly RoomAvatarPrefetchRole[];
  limit?: number;
}): number[] {
  const limit = params.limit ?? Number.POSITIVE_INFINITY;
  if (limit <= 0) {
    return [];
  }

  const ids = new Set<number>();
  const addId = (value: unknown) => {
    if (ids.size >= limit) {
      return;
    }
    const avatarId = getPositiveId(value);
    if (avatarId != null) {
      ids.add(avatarId);
    }
  };

  const messagesByDescendingPosition = [...params.messages]
    .sort((left, right) => getMessagePosition(right) - getMessagePosition(left));

  for (const message of messagesByDescendingPosition) {
    if (getPositiveId(message.message?.avatarFileId) == null) {
      addId(message.message?.avatarId);
    }
  }

  for (const role of params.roles ?? []) {
    if (getPositiveId(role.avatarFileId) == null) {
      addId(role.avatarId);
    }
  }

  return Array.from(ids);
}

export function shouldPrefetchRoomAvatars(runtime: RoomAvatarPrefetchRuntime = {}): boolean {
  const documentLike = runtime.document ?? (typeof document === "undefined" ? undefined : document);
  if (documentLike?.visibilityState === "hidden") {
    return false;
  }

  const browserNavigator = typeof navigator === "undefined" ? undefined : (navigator as BrowserNavigatorLike);
  const navigatorLike: BrowserNavigatorLike | undefined = runtime.navigator ?? browserNavigator;
  const connection = navigatorLike?.connection;
  if (connection?.saveData) {
    return false;
  }

  const effectiveType = connection?.effectiveType?.toLowerCase();
  return effectiveType !== "slow-2g" && effectiveType !== "2g";
}

export async function prefetchAvatarImageUrl(url: string, runtime: RoomAvatarPrefetchRuntime = {}): Promise<void> {
  const normalizedUrl = url.trim();
  const ImageCtor = runtime.Image ?? (typeof Image === "undefined" ? undefined : Image);
  if (!normalizedUrl || !ImageCtor) {
    return;
  }

  await new Promise<void>((resolve) => {
    const image = new ImageCtor();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = normalizedUrl;
  });
}

export async function prefetchRoomAvatarBatch(params: {
  queryClient: QueryClient;
  avatarIds: readonly number[];
  runtime?: RoomAvatarPrefetchRuntime;
  prefetchAvatarImageUrl?: PrefetchAvatarImageUrl;
}): Promise<void> {
  const prefetchImage = params.prefetchAvatarImageUrl ?? prefetchAvatarImageUrl;
  if (!shouldPrefetchRoomAvatars(params.runtime)) {
    return;
  }

  const metadata = await fetchClientMetadataBatchWithCache(params.queryClient, tuanchat, {
    avatarIds: [...params.avatarIds],
  });
  await Promise.all(Object.values(metadata.avatars ?? {}).map(async (avatar) => {
    const avatarFileId = avatar.avatarFileId;
    const avatarThumbUrl = imageLowUrl(avatarFileId);
    if (avatarThumbUrl) {
      await prefetchImage(avatarThumbUrl, params.runtime);
    }
  }));
}

export default function useRoomAvatarPrefetch({
  queryClient,
  messages,
  roles,
  interactionVersion = 0,
  enabled = true,
  runtime,
  prefetchAvatarImageUrl,
}: RoomAvatarPrefetchOptions): void {
  const lastInteractionAtRef = useRef(0);
  const latestAvatarIdsRef = useRef<number[]>([]);
  const prefetchedAvatarIdsRef = useRef<Set<number>>(new Set());

  const avatarIds = useMemo(() => collectRoomAvatarPrefetchIds({ messages, roles }), [messages, roles]);
  latestAvatarIdsRef.current = avatarIds;

  useEffect(() => {
    const now = runtime?.now ?? Date.now;
    lastInteractionAtRef.current = now();
  }, [interactionVersion, runtime]);

  useEffect(() => {
    if (!enabled || avatarIds.length === 0) {
      return;
    }

    let cancelled = false;
    let cancelCurrentTask = () => {};

    const queueNextBatch = () => {
      cancelCurrentTask = scheduleNonCriticalTask(() => {
        const now = runtime?.now ?? Date.now;
        const quietForMs = now() - lastInteractionAtRef.current;
        if (cancelled || quietForMs < ROOM_AVATAR_PREFETCH_RECENT_INTERACTION_QUIET_MS) {
          return;
        }

        const prefetchedAvatarIds = prefetchedAvatarIdsRef.current;
        const nextBatch = latestAvatarIdsRef.current
          .filter(avatarId => !prefetchedAvatarIds.has(avatarId))
          .slice(0, ROOM_AVATAR_PREFETCH_BATCH_SIZE);

        if (nextBatch.length === 0) {
          return;
        }

        for (const avatarId of nextBatch) {
          prefetchedAvatarIds.add(avatarId);
        }

        void prefetchRoomAvatarBatch({
          queryClient,
          avatarIds: nextBatch,
          runtime,
          prefetchAvatarImageUrl,
        })
          .catch((error) => {
            for (const avatarId of nextBatch) {
              prefetchedAvatarIds.delete(avatarId);
            }
            console.warn("[RoomAvatarPrefetch] 头像预取失败", error);
          })
          .finally(() => {
            if (!cancelled) {
              queueNextBatch();
            }
          });
      }, {
        delayMs: ROOM_AVATAR_PREFETCH_DELAY_MS,
        idleTimeoutMs: ROOM_AVATAR_PREFETCH_IDLE_TIMEOUT_MS,
      });
    };

    queueNextBatch();

    return () => {
      cancelled = true;
      cancelCurrentTask();
    };
  }, [avatarIds, enabled, prefetchAvatarImageUrl, queryClient, runtime]);
}
