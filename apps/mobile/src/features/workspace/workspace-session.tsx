import type { PropsWithChildren } from "react";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthSession } from "@/features/auth/auth-session";

import {
  clearStoredWorkspaceSelection,
  readStoredWorkspaceSelection,
  writeStoredWorkspaceSelection,
} from "./workspaceStorage";

type WorkspaceSessionContextValue = {
  activeDirectContactId: number | null;
  selectedSpaceId: number | null;
  selectedRoomId: number | null;
  setActiveDirectContactId: (contactId: number | null) => void;
  setWorkspaceSelection: (spaceId: number | null, roomId: number | null) => void;
  setSelectedSpaceId: (spaceId: number | null) => void;
  setSelectedRoomId: (roomId: number | null) => void;
  clearWorkspaceSelection: () => void;
  chatTabBarHidden: boolean;
  setChatTabBarHidden: (hidden: boolean) => void;
};

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null);

export function WorkspaceSessionProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const [selectedSpaceId, setSelectedSpaceIdState] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomIdState] = useState<number | null>(null);
  const [activeDirectContactId, setActiveDirectContactId] = useState<number | null>(null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const [chatTabBarHidden, setChatTabBarHidden] = useState(false);
  const workspaceSelectionOverrideRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (isBootstrapping) {
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated) {
      queueMicrotask(() => setSelectedSpaceIdState(null));
      queueMicrotask(() => setSelectedRoomIdState(null));
      queueMicrotask(() => setActiveDirectContactId(null));
      queueMicrotask(() => setHasHydratedSelection(false));
      workspaceSelectionOverrideRef.current = false;
      void clearStoredWorkspaceSelection();
      return () => {
        cancelled = true;
      };
    }

    if (hasHydratedSelection) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const storedSelection = await readStoredWorkspaceSelection();
      if (cancelled) {
        return;
      }

      if (workspaceSelectionOverrideRef.current) {
        setHasHydratedSelection(true);
        return;
      }

      setSelectedSpaceIdState(storedSelection?.selectedSpaceId ?? null);
      setSelectedRoomIdState(storedSelection?.selectedRoomId ?? null);
      setHasHydratedSelection(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedSelection, isAuthenticated, isBootstrapping]);

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated || !hasHydratedSelection) {
      return;
    }

    void writeStoredWorkspaceSelection({
      selectedSpaceId: selectedSpaceId ?? undefined,
      selectedRoomId: selectedRoomId ?? undefined,
    });
  }, [hasHydratedSelection, isAuthenticated, isBootstrapping, selectedRoomId, selectedSpaceId]);

  const setSelectedSpaceId = useCallback((spaceId: number | null) => {
    setSelectedSpaceIdState(spaceId);
    setSelectedRoomIdState(null);
  }, []);

  const setSelectedRoomId = useCallback((roomId: number | null) => {
    setSelectedRoomIdState(roomId);
  }, []);

  const setWorkspaceSelection = useCallback((spaceId: number | null, roomId: number | null) => {
    workspaceSelectionOverrideRef.current = true;
    setHasHydratedSelection(true);
    setSelectedSpaceIdState(spaceId);
    setSelectedRoomIdState(roomId);
  }, []);

  const clearWorkspaceSelection = useCallback(() => {
    setSelectedSpaceIdState(null);
    setSelectedRoomIdState(null);
    void clearStoredWorkspaceSelection();
  }, []);

  const value = useMemo<WorkspaceSessionContextValue>(() => ({
    activeDirectContactId,
    selectedSpaceId,
    selectedRoomId,
    setActiveDirectContactId,
    setWorkspaceSelection,
    setSelectedSpaceId,
    setSelectedRoomId,
    clearWorkspaceSelection,
    chatTabBarHidden,
    setChatTabBarHidden,
  }), [activeDirectContactId, chatTabBarHidden, clearWorkspaceSelection, selectedRoomId, selectedSpaceId, setSelectedRoomId, setSelectedSpaceId, setWorkspaceSelection]);

  return (
    <WorkspaceSessionContext value={value}>
      {children}
    </WorkspaceSessionContext>
  );
}

export function useWorkspaceSession() {
  const value = use(WorkspaceSessionContext);
  if (!value) {
    throw new Error("useWorkspaceSession 必须在 WorkspaceSessionProvider 内使用。");
  }
  return value;
}
