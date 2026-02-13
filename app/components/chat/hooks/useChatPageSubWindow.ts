import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";

export type ChatPageSubWindowTab = "room" | "doc" | "thread";

export type ChatPageSubWindowSnapshot = {
  isOpen: boolean;
  width: number;
  tab: ChatPageSubWindowTab;
  roomId: number | null;
  docId: string | null;
  threadRootMessageId: number | null;
};

type ChatPageSubWindowMap = Record<string, ChatPageSubWindowSnapshot>;

const DEFAULT_SNAPSHOT: ChatPageSubWindowSnapshot = {
  isOpen: false,
  width: 560,
  tab: "doc",
  roomId: null,
  docId: null,
  threadRootMessageId: null,
};

function normalizeSnapshot(raw?: Partial<ChatPageSubWindowSnapshot> | null): ChatPageSubWindowSnapshot {
  const width = typeof raw?.width === "number" && Number.isFinite(raw.width) ? raw.width : DEFAULT_SNAPSHOT.width;
  const tab = raw?.tab === "room" || raw?.tab === "doc" || raw?.tab === "thread" ? raw.tab : DEFAULT_SNAPSHOT.tab;
  const roomId = typeof raw?.roomId === "number" && Number.isFinite(raw.roomId) ? raw.roomId : null;
  const docId = typeof raw?.docId === "string" && raw.docId.length > 0 ? raw.docId : null;
  const threadRootMessageId = typeof raw?.threadRootMessageId === "number" && Number.isFinite(raw.threadRootMessageId)
    ? raw.threadRootMessageId
    : null;
  const isOpen = typeof raw?.isOpen === "boolean" ? raw.isOpen : DEFAULT_SNAPSHOT.isOpen;
  return {
    isOpen,
    width,
    tab,
    roomId,
    docId,
    threadRootMessageId,
  };
}

type UseChatPageSubWindowParams = {
  activeSpaceId: number | null;
  activeRoomId: number | null;
  activeDocId: string | null;
};

type UseChatPageSubWindowResult = ChatPageSubWindowSnapshot & {
  setIsOpen: (next: boolean) => void;
  setWidth: (next: number) => void;
  setTab: (next: ChatPageSubWindowTab) => void;
  setRoomId: (roomId: number | null) => void;
  setDocId: (docId: string | null) => void;
  setThreadRootMessageId: (messageId: number | null) => void;
};

export default function useChatPageSubWindow({
  activeSpaceId,
  activeRoomId,
  activeDocId,
}: UseChatPageSubWindowParams): UseChatPageSubWindowResult {
  const [stateMap, setStateMap] = useLocalStorage<ChatPageSubWindowMap>("spaceSubWindowStates", {});
  const spaceKey = useMemo(() => {
    return typeof activeSpaceId === "number" && activeSpaceId > 0 ? String(activeSpaceId) : null;
  }, [activeSpaceId]);

  const snapshot = useMemo(() => {
    if (!spaceKey) {
      return DEFAULT_SNAPSHOT;
    }
    const raw = stateMap[spaceKey];
    return normalizeSnapshot(raw);
  }, [spaceKey, stateMap]);

  const updateSnapshot = useCallback((patch: Partial<ChatPageSubWindowSnapshot>) => {
    if (!spaceKey) {
      return;
    }
    setStateMap((prev) => {
      const prevSnapshot = normalizeSnapshot(prev[spaceKey]);
      const nextSnapshot = normalizeSnapshot({ ...prevSnapshot, ...patch });
      return { ...prev, [spaceKey]: nextSnapshot };
    });
  }, [setStateMap, spaceKey]);

  const setIsOpen = useCallback((next: boolean) => {
    updateSnapshot({ isOpen: next });
  }, [updateSnapshot]);

  const setWidth = useCallback((next: number) => {
    updateSnapshot({ width: next });
  }, [updateSnapshot]);

  const setTab = useCallback((next: ChatPageSubWindowTab) => {
    updateSnapshot({ tab: next });
  }, [updateSnapshot]);

  const setRoomId = useCallback((roomId: number | null) => {
    updateSnapshot({ tab: "room", roomId });
  }, [updateSnapshot]);

  const setDocId = useCallback((docId: string | null) => {
    updateSnapshot({ tab: "doc", docId });
  }, [updateSnapshot]);

  const setThreadRootMessageId = useCallback((messageId: number | null) => {
    updateSnapshot({ tab: "thread", threadRootMessageId: messageId });
  }, [updateSnapshot]);

  const openedOnceRef = useRef(false);
  const lastSpaceKeyRef = useRef(spaceKey);

  useEffect(() => {
    if (lastSpaceKeyRef.current !== spaceKey) {
      lastSpaceKeyRef.current = spaceKey;
      openedOnceRef.current = false;
    }
  }, [spaceKey]);

  useEffect(() => {
    if (!spaceKey) {
      return;
    }
    if (!snapshot.isOpen) {
      openedOnceRef.current = false;
      return;
    }
    if (openedOnceRef.current) {
      return;
    }
    openedOnceRef.current = true;

    if (snapshot.tab === "room" && snapshot.roomId == null && activeRoomId != null) {
      setRoomId(activeRoomId);
    }
    if (snapshot.tab === "doc" && snapshot.docId == null && activeDocId) {
      setDocId(activeDocId);
    }
  }, [
    activeDocId,
    activeRoomId,
    setDocId,
    setRoomId,
    snapshot.docId,
    snapshot.isOpen,
    snapshot.roomId,
    snapshot.tab,
    spaceKey,
  ]);

  return {
    ...snapshot,
    setIsOpen,
    setWidth,
    setTab,
    setRoomId,
    setDocId,
    setThreadRootMessageId,
  };
}
