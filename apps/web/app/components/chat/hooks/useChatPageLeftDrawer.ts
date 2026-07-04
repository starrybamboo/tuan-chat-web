import { useCallback, useEffect, useState } from "react";

type ScreenSize = "sm" | "md" | "lg";

type UseChatPageLeftDrawerParams = {
  screenSize: ScreenSize;
  isPrivateChatMode: boolean;
  urlSpaceId?: string;
  urlRoomId?: string;
  drawerStateKey?: string;
  mobileStateKey?: string;
};

type UseChatPageLeftDrawerResult = {
  isOpenLeftDrawer: boolean;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  toggleLeftDrawer: () => void;
  closeLeftDrawer: () => void;
};

export const CHAT_LEFT_DRAWER_STATE_KEY = "chat-left-drawer";

const drawerStateCache = new Map<string, boolean>();

export default function useChatPageLeftDrawer({
  screenSize,
  isPrivateChatMode,
  urlSpaceId,
  urlRoomId,
  drawerStateKey,
  mobileStateKey,
}: UseChatPageLeftDrawerParams): UseChatPageLeftDrawerResult {
  const stateCacheKey = screenSize === "sm" ? mobileStateKey : drawerStateKey;
  const [isOpenLeftDrawer, setIsOpenLeftDrawerState] = useState(() => {
    if (stateCacheKey && drawerStateCache.has(stateCacheKey)) {
      return Boolean(drawerStateCache.get(stateCacheKey));
    }
    if (screenSize !== "sm") {
      return true;
    }
    return !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || !isPrivateChatMode;
  });

  const setIsOpenLeftDrawer = useCallback((isOpen: boolean) => {
    if (stateCacheKey) {
      drawerStateCache.set(stateCacheKey, isOpen);
    }
    setIsOpenLeftDrawerState(isOpen);
  }, [stateCacheKey]);

  const toggleLeftDrawer = useCallback(() => {
    setIsOpenLeftDrawerState((prev) => {
      const next = !prev;
      if (stateCacheKey) {
        drawerStateCache.set(stateCacheKey, next);
      }
      return next;
    });
  }, [stateCacheKey]);

  const closeLeftDrawer = useCallback(() => {
    if (screenSize === "sm") {
      if (stateCacheKey) {
        drawerStateCache.set(stateCacheKey, false);
      }
      setIsOpenLeftDrawerState(false);
    }
  }, [screenSize, stateCacheKey]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const className = "chat-lock-scroll";
    const body = document.body;
    if (screenSize === "sm") {
      body.classList.add(className);
    }
    else {
      body.classList.remove(className);
    }
    return () => {
      body.classList.remove(className);
    };
  }, [screenSize]);

  useEffect(() => {
    if (screenSize !== "sm") {
      return;
    }
    // 移动端进入“空间主页态”（/chat/:spaceId/space）时，自动展开左侧抽屉，便于直接选择房间。
    if (!isPrivateChatMode && urlSpaceId && urlRoomId === "space") {
      queueMicrotask(() => setIsOpenLeftDrawerState(true));
    }
  }, [isPrivateChatMode, screenSize, urlRoomId, urlSpaceId]);

  return {
    isOpenLeftDrawer,
    setIsOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  };
}
