import { useCallback, useEffect, useState } from "react";

type ScreenSize = "sm" | "md" | "lg";

type UseChatPageLeftDrawerParams = {
  screenSize: ScreenSize;
  isPrivateChatMode: boolean;
  urlSpaceId?: string;
  urlRoomId?: string;
};

type UseChatPageLeftDrawerResult = {
  isOpenLeftDrawer: boolean;
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
  toggleLeftDrawer: () => void;
  closeLeftDrawer: () => void;
};

export default function useChatPageLeftDrawer({
  screenSize,
  isPrivateChatMode,
  urlSpaceId,
  urlRoomId,
}: UseChatPageLeftDrawerParams): UseChatPageLeftDrawerResult {
  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useState(() => {
    if (screenSize !== "sm") {
      return true;
    }
    return !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || !isPrivateChatMode;
  });

  const toggleLeftDrawer = useCallback(() => {
    setIsOpenLeftDrawer(prev => !prev);
  }, []);

  const closeLeftDrawer = useCallback(() => {
    if (screenSize === "sm") {
      setIsOpenLeftDrawer(false);
    }
  }, [screenSize]);

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

  return {
    isOpenLeftDrawer,
    setIsOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  };
}
