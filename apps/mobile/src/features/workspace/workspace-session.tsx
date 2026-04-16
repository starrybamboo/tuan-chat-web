import type { PropsWithChildren } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { useAuthSession } from "@/features/auth/auth-session";

import {
  clearStoredWorkspaceSelection,
  readStoredWorkspaceSelection,
  writeStoredWorkspaceSelection,
} from "./workspaceStorage";

interface WorkspaceSessionContextValue {
  selectedSpaceId: number | null;
  selectedRoomId: number | null;
  setSelectedSpaceId: (spaceId: number | null) => void;
  setSelectedRoomId: (roomId: number | null) => void;
  clearWorkspaceSelection: () => void;
}

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null);

export function WorkspaceSessionProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isBootstrapping } = useAuthSession();
  const [selectedSpaceId, setSelectedSpaceIdState] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomIdState] = useState<number | null>(null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (isBootstrapping) {
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthenticated) {
      setSelectedSpaceIdState(null);
      setSelectedRoomIdState(null);
      setHasHydratedSelection(false);
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

  const clearWorkspaceSelection = useCallback(() => {
    setSelectedSpaceIdState(null);
    setSelectedRoomIdState(null);
    void clearStoredWorkspaceSelection();
  }, []);

  const value = useMemo<WorkspaceSessionContextValue>(() => ({
    selectedSpaceId,
    selectedRoomId,
    setSelectedSpaceId,
    setSelectedRoomId,
    clearWorkspaceSelection,
  }), [clearWorkspaceSelection, selectedRoomId, selectedSpaceId, setSelectedRoomId, setSelectedSpaceId]);

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
