import { useCallback, useEffect, useState } from "react";

type ScreenSize = "sm" | "md" | "lg";

type UseChatPageLeftDrawerParams = {
  screenSize: ScreenSize;
  isPrivateChatMode: boolean;
  urlSpaceId?: string;
  urlRoomId?: string;
  mobileStateKey?: string;
};

type UseChatPageLeftDrawerResult = {
  isOpenLeftDrawer: boolean;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  toggleLeftDrawer: () => void;
  closeLeftDrawer: () => void;
};

const mobileDrawerStateCache = new Map<string, boolean>();

export default function useChatPageLeftDrawer({
  screenSize,
  isPrivateChatMode,
  urlSpaceId,
  urlRoomId,
  mobileStateKey,
}: UseChatPageLeftDrawerParams): UseChatPageLeftDrawerResult {
  const [isOpenLeftDrawer, setIsOpenLeftDrawerState] = useState(() => {
    if (screenSize !== "sm") {
      return true;
    }
    if (mobileStateKey && mobileDrawerStateCache.has(mobileStateKey)) {
      return Boolean(mobileDrawerStateCache.get(mobileStateKey));
    }
    return !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || !isPrivateChatMode;
  });

  const setIsOpenLeftDrawer = useCallback((isOpen: boolean) => {
    if (screenSize === "sm" && mobileStateKey) {
      mobileDrawerStateCache.set(mobileStateKey, isOpen);
    }
    setIsOpenLeftDrawerState(isOpen);
  }, [mobileStateKey, screenSize]);

  const toggleLeftDrawer = useCallback(() => {
    setIsOpenLeftDrawerState((prev) => {
      const next = !prev;
      if (screenSize === "sm" && mobileStateKey) {
        mobileDrawerStateCache.set(mobileStateKey, next);
      }
      return next;
    });
  }, [mobileStateKey, screenSize]);

  const closeLeftDrawer = useCallback(() => {
    if (screenSize === "sm") {
      if (mobileStateKey) {
        mobileDrawerStateCache.set(mobileStateKey, false);
      }
      setIsOpenLeftDrawerState(false);
    }
  }, [mobileStateKey, screenSize]);

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
      setIsOpenLeftDrawerState(true);
    }
  }, [isPrivateChatMode, screenSize, urlRoomId, urlSpaceId]);

  return {
    isOpenLeftDrawer,
    setIsOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  };
}
