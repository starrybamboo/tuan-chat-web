import type { QueryClient } from "@tanstack/react-query";

import { fetchClientMetadataBatchWithCache } from "@tuanchat/query/metadata";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  prefetchImageAssetUrl,
  type ImageAssetPrefetchRuntime,
} from "@/utils/media/imageAssetPrefetch";
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
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

type BrowserNavigatorLike = {
  connection?: BrowserConnectionLike;
};

type RoomAvatarPrefetchRuntime = {
  document?: Pick<Document, "visibilityState">;
  navigator?: BrowserNavigatorLike;
  now?: () => number;
} & ImageAssetPrefetchRuntime;

type PrefetchImageAssetUrl = (url: string, runtime?: ImageAssetPrefetchRuntime) => Promise<boolean | void>;

export type ResolveRoomAvatarAssetUrls = (avatar: RoomAvatarPrefetchRole) => readonly (string | null | undefined)[];

export type RoomAvatarPrefetchOptions = {
  queryClient: QueryClient;
  messages: readonly RoomAvatarPrefetchMessage[];
  roles?: readonly RoomAvatarPrefetchRole[];
  interactionVersion?: number;
  enabled?: boolean;
  runtime?: RoomAvatarPrefetchRuntime;
  prefetchImageAssetUrl?: PrefetchImageAssetUrl;
  resolveAvatarAssetUrls?: ResolveRoomAvatarAssetUrls;
};

function getPositiveId(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getMessagePosition(message: RoomAvatarPrefetchMessage): number {
  const position = message.message?.position;
  return typeof position === "number" && Number.isFinite(position) ? position : Number.NEGATIVE_INFINITY;
}

function resolveDefaultRoomAvatarAssetUrls(avatar: RoomAvatarPrefetchRole): string[] {
  const avatarThumbUrl = imageLowUrl(avatar.avatarFileId);
  return avatarThumbUrl ? [avatarThumbUrl] : [];
}

export function collectRoomAvatarPrefetchAssetUrls(params: {
  messages: readonly RoomAvatarPrefetchMessage[];
  roles?: readonly RoomAvatarPrefetchRole[];
  resolveAvatarAssetUrls?: ResolveRoomAvatarAssetUrls;
}): string[] {
  const resolveAssetUrls = params.resolveAvatarAssetUrls ?? resolveDefaultRoomAvatarAssetUrls;
  const urls = new Set<string>();
  const addAvatarUrls = (avatar: RoomAvatarPrefetchRole | null | undefined) => {
    if (getPositiveId(avatar?.avatarFileId) == null) {
      return;
    }
    for (const url of resolveAssetUrls(avatar ?? {})) {
      const normalizedUrl = url?.trim();
      if (normalizedUrl) {
        urls.add(normalizedUrl);
      }
    }
  };

  [...params.messages]
    .sort((left, right) => getMessagePosition(right) - getMessagePosition(left))
    .forEach(message => addAvatarUrls(message.message));
  (params.roles ?? []).forEach(addAvatarUrls);
  return [...urls];
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

export async function prefetchRoomAvatarBatch(params: {
  queryClient: QueryClient;
  avatarIds: readonly number[];
  runtime?: RoomAvatarPrefetchRuntime;
  prefetchImageAssetUrl?: PrefetchImageAssetUrl;
  resolveAvatarAssetUrls?: ResolveRoomAvatarAssetUrls;
}): Promise<boolean> {
  const prefetchImage = params.prefetchImageAssetUrl ?? prefetchImageAssetUrl;
  const resolveAssetUrls = params.resolveAvatarAssetUrls ?? resolveDefaultRoomAvatarAssetUrls;
  if (!shouldPrefetchRoomAvatars(params.runtime)) {
    return false;
  }

  const metadata = await fetchClientMetadataBatchWithCache(params.queryClient, tuanchat, {
    avatarIds: [...params.avatarIds],
  });
  let allAssetsPrefetched = true;
  await Promise.all(Object.values(metadata.avatars ?? {}).map(async (avatar) => {
    const assetUrls = resolveAssetUrls(avatar).filter((url): url is string => Boolean(url?.trim()));
    const results = await Promise.all(assetUrls.map(url => prefetchImage(url, params.runtime)));
    if (results.some(result => result === false)) {
      allAssetsPrefetched = false;
    }
  }));
  return allAssetsPrefetched;
}

export default function useRoomAvatarPrefetch({
  queryClient,
  messages,
  roles,
  interactionVersion = 0,
  enabled = true,
  runtime,
  prefetchImageAssetUrl: prefetchImageAssetUrlOverride,
  resolveAvatarAssetUrls,
}: RoomAvatarPrefetchOptions): void {
  const [prefetchEnvironmentVersion, setPrefetchEnvironmentVersion] = useState(0);
  const lastInteractionAtRef = useRef(0);
  const latestAvatarIdsRef = useRef<number[]>([]);
  const latestAssetUrlsRef = useRef<string[]>([]);
  const prefetchedAvatarIdsRef = useRef<Set<number>>(new Set());
  const prefetchedAssetUrlsRef = useRef<Set<string>>(new Set());

  const avatarIds = useMemo(() => collectRoomAvatarPrefetchIds({ messages, roles }), [messages, roles]);
  const assetUrls = useMemo(() => collectRoomAvatarPrefetchAssetUrls({
    messages,
    roles,
    resolveAvatarAssetUrls,
  }), [messages, resolveAvatarAssetUrls, roles]);
  latestAvatarIdsRef.current = avatarIds;
  latestAssetUrlsRef.current = assetUrls;

  useEffect(() => {
    const notifyEnvironmentChange = () => setPrefetchEnvironmentVersion(version => version + 1);
    const documentLike = typeof document === "undefined" ? null : document;
    const windowLike = typeof window === "undefined" ? null : window;
    const navigatorLike = typeof navigator === "undefined" ? undefined : (navigator as BrowserNavigatorLike);
    const connection = navigatorLike?.connection;

    documentLike?.addEventListener("visibilitychange", notifyEnvironmentChange);
    windowLike?.addEventListener("online", notifyEnvironmentChange);
    connection?.addEventListener?.("change", notifyEnvironmentChange);

    return () => {
      documentLike?.removeEventListener("visibilitychange", notifyEnvironmentChange);
      windowLike?.removeEventListener("online", notifyEnvironmentChange);
      connection?.removeEventListener?.("change", notifyEnvironmentChange);
    };
  }, []);

  useEffect(() => {
    const now = runtime?.now ?? Date.now;
    lastInteractionAtRef.current = now();
  }, [interactionVersion, runtime]);

  useEffect(() => {
    if (!enabled || (avatarIds.length === 0 && assetUrls.length === 0)) {
      return;
    }

    let cancelled = false;
    let cancelCurrentTask = () => {};

    const queueNextBatch = () => {
      cancelCurrentTask = scheduleNonCriticalTask(() => {
        const now = runtime?.now ?? Date.now;
        const quietForMs = now() - lastInteractionAtRef.current;
        if (cancelled) {
          return;
        }
        if (quietForMs < ROOM_AVATAR_PREFETCH_RECENT_INTERACTION_QUIET_MS) {
          queueNextBatch();
          return;
        }
        if (!shouldPrefetchRoomAvatars(runtime)) {
          return;
        }

        const prefetchedAvatarIds = prefetchedAvatarIdsRef.current;
        const prefetchedAssetUrls = prefetchedAssetUrlsRef.current;
        const nextAssetUrls = latestAssetUrlsRef.current
          .filter(url => !prefetchedAssetUrls.has(url))
          .slice(0, ROOM_AVATAR_PREFETCH_BATCH_SIZE);
        const nextBatch = latestAvatarIdsRef.current
          .filter(avatarId => !prefetchedAvatarIds.has(avatarId))
          .slice(0, ROOM_AVATAR_PREFETCH_BATCH_SIZE - nextAssetUrls.length);

        if (nextBatch.length === 0 && nextAssetUrls.length === 0) {
          return;
        }

        let batchCompleted = false;
        const prefetchImage = prefetchImageAssetUrlOverride ?? prefetchImageAssetUrl;
        const directAssetsPromise = Promise.all(
          nextAssetUrls.map(url => prefetchImage(url, runtime)),
        ).then(results => results.every(result => result !== false));
        const metadataAssetsPromise = nextBatch.length > 0
          ? prefetchRoomAvatarBatch({
              queryClient,
              avatarIds: nextBatch,
              runtime,
              prefetchImageAssetUrl: prefetchImageAssetUrlOverride,
              resolveAvatarAssetUrls,
            })
          : Promise.resolve(true);

        void Promise.all([directAssetsPromise, metadataAssetsPromise])
          .then(([directAssetsCompleted, metadataAssetsCompleted]) => {
            if (cancelled || !directAssetsCompleted || !metadataAssetsCompleted) {
              return;
            }
            for (const avatarId of nextBatch) {
              prefetchedAvatarIds.add(avatarId);
            }
            for (const url of nextAssetUrls) {
              prefetchedAssetUrls.add(url);
            }
            batchCompleted = true;
          })
          .catch((error) => {
            console.warn("[RoomAvatarPrefetch] 头像预取失败", error);
          })
          .finally(() => {
            if (!cancelled && batchCompleted) {
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
  }, [assetUrls, avatarIds, enabled, prefetchEnvironmentVersion, prefetchImageAssetUrlOverride, queryClient, resolveAvatarAssetUrls, runtime]);
}
