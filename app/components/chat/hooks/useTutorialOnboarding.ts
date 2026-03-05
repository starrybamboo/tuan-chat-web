import type { NavigateFunction } from "react-router";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TutorialBootstrapResponse } from "api/hooks/tutorialOnboardingHooks";

import {
  fetchTutorialBootstrap,
  useTutorialPullMutation,
} from "api/hooks/tutorialOnboardingHooks";

const TUTORIAL_PROMPT_SEEN_STORAGE_KEY = "tc:tutorial:onboarding:seen";

type TutorialPromptType = "missing" | "update";

function debugTutorialOnboarding(event: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }
  const debugEntry = {
    time: new Date().toISOString(),
    event,
    payload: payload ?? {},
  };
  const debugStore = ((window as any).__TC_TUTORIAL_DEBUG__ ??= { entries: [] as typeof debugEntry[] });
  debugStore.entries.push(debugEntry);
  if (debugStore.entries.length > 100) {
    debugStore.entries.splice(0, debugStore.entries.length - 100);
  }
  console.warn("[TutorialOnboarding]", event, payload ?? {});
}

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readTutorialPromptSeenMap(): Record<string, true> {
  if (!isBrowserStorageAvailable()) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(TUTORIAL_PROMPT_SEEN_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, true>;
  }
  catch {
    return {};
  }
}

function hasSeenTutorialPrompt(seenKey: string | null) {
  if (!seenKey) {
    return false;
  }
  const seenMap = readTutorialPromptSeenMap();
  return seenMap[seenKey] === true;
}

function markTutorialPromptSeen(seenKey: string | null) {
  if (!seenKey || !isBrowserStorageAvailable()) {
    return;
  }
  const seenMap = readTutorialPromptSeenMap();
  seenMap[seenKey] = true;
  try {
    window.localStorage.setItem(TUTORIAL_PROMPT_SEEN_STORAGE_KEY, JSON.stringify(seenMap));
  }
  catch {
    // ignore localStorage write failures
  }
}

function buildTutorialPromptSeenKey(
  userId: number,
  promptType: TutorialPromptType,
  data: TutorialBootstrapResponse,
) {
  if (userId <= 0) {
    return null;
  }
  const tutorialRepositoryId = data.tutorialRepositoryId;
  if (typeof tutorialRepositoryId !== "number" || tutorialRepositoryId <= 0) {
    return null;
  }
  const latestCommitIdPart = data.latestCommitId ?? "none";
  return `u:${userId}:repo:${tutorialRepositoryId}:type:${promptType}:latest:${latestCommitIdPart}`;
}

type UseTutorialOnboardingParams = {
  userId: number;
  enabled: boolean;
  navigate: NavigateFunction;
};


type UseTutorialOnboardingResult = {
  tutorialUpdatePrompt: TutorialBootstrapResponse | null;
  tutorialPromptType: "missing" | "update" | null;
  isPullingTutorialUpdate: boolean;
  closeTutorialUpdatePrompt: (suppressUntilUpdate?: boolean) => void;
  confirmTutorialUpdatePull: () => Promise<void>;
};

export default function useTutorialOnboarding({
  userId,
  enabled,
  navigate,
}: UseTutorialOnboardingParams): UseTutorialOnboardingResult {
  const queryClient = useQueryClient();
  const pullMutation = useTutorialPullMutation();
  const bootstrappedUserIdRef = useRef<number | null>(null);
  const isBootstrappingRef = useRef(false);
  const activePromptSeenKeyRef = useRef<string | null>(null);
  const [tutorialUpdatePrompt, setTutorialUpdatePrompt] = useState<TutorialBootstrapResponse | null>(null);
  const [tutorialPromptType, setTutorialPromptType] = useState<"missing" | "update" | null>(null);

  const refreshUserSpaceCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] }),
      queryClient.invalidateQueries({ queryKey: ["getUserActiveSpaces"] }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    debugTutorialOnboarding("effect-enter", {
      enabled,
      userId,
      bootstrappedUserId: bootstrappedUserIdRef.current,
      isBootstrapPending: isBootstrappingRef.current,
    });
    if (!enabled || userId <= 0) {
      debugTutorialOnboarding("effect-skip-disabled-or-anonymous", { enabled, userId });
      return;
    }
    if (bootstrappedUserIdRef.current === userId || isBootstrappingRef.current) {
      debugTutorialOnboarding("effect-skip-already-bootstrapped-or-pending", {
        userId,
        bootstrappedUserId: bootstrappedUserIdRef.current,
        isBootstrapPending: isBootstrappingRef.current,
      });
      return;
    }
    bootstrappedUserIdRef.current = userId;
    isBootstrappingRef.current = true;
    debugTutorialOnboarding("bootstrap-mutate-start", { userId });

    void fetchTutorialBootstrap()
      .then((response) => {
        debugTutorialOnboarding("bootstrap-success", { response });
        if (!response?.success) {
          debugTutorialOnboarding("bootstrap-ignore-response-not-success", { response });
          return;
        }
        const data = response.data;
        if (!data?.enabled) {
          debugTutorialOnboarding("bootstrap-ignore-tutorial-disabled", { data });
          return;
        }
        activePromptSeenKeyRef.current = null;

        if (data.missingTutorial) {
          const seenKey = buildTutorialPromptSeenKey(userId, "missing", data);
          debugTutorialOnboarding("prompt-open-missing", { data, seenKey });
          if (hasSeenTutorialPrompt(seenKey)) {
            debugTutorialOnboarding("missing-skip-seen", { seenKey });
            return;
          }
          activePromptSeenKeyRef.current = seenKey;
          setTutorialPromptType("missing");
          setTutorialUpdatePrompt(data);
          return;
        }

        if (data.updateAvailable) {
          const seenKey = buildTutorialPromptSeenKey(userId, "update", data);
          debugTutorialOnboarding("update-available", { data, seenKey });
          if (hasSeenTutorialPrompt(seenKey)) {
            debugTutorialOnboarding("update-skip-seen", { seenKey });
            return;
          }
          activePromptSeenKeyRef.current = seenKey;
          debugTutorialOnboarding("prompt-open-update", { data, seenKey });
          setTutorialPromptType("update");
          setTutorialUpdatePrompt(data);
          return;
        }
        debugTutorialOnboarding("bootstrap-no-prompt", { data });
      })
      .catch((error) => {
        debugTutorialOnboarding("bootstrap-error", {
          error: error instanceof Error ? { name: error.name, message: error.message } : { value: String(error) },
        });
        // 失败后允许下一次重新尝试。
        bootstrappedUserIdRef.current = null;
      })
      .finally(() => {
        isBootstrappingRef.current = false;
        debugTutorialOnboarding("bootstrap-finished", {
          userId,
          bootstrappedUserId: bootstrappedUserIdRef.current,
        });
      });
  }, [enabled, userId]);

  useEffect(() => {
    debugTutorialOnboarding("state-changed", {
      tutorialPromptType,
      tutorialUpdatePrompt,
    });
  }, [tutorialPromptType, tutorialUpdatePrompt]);

  const closeTutorialUpdatePrompt = useCallback((suppressUntilUpdate?: boolean) => {
    if (suppressUntilUpdate) {
      markTutorialPromptSeen(activePromptSeenKeyRef.current);
    }
    activePromptSeenKeyRef.current = null;
    setTutorialPromptType(null);
    setTutorialUpdatePrompt(null);
  }, []);

  const confirmTutorialUpdatePull = useCallback(async () => {
    if (pullMutation.isPending) {
      return;
    }
    const response = await pullMutation.mutateAsync();
    if (!response?.success) {
      return;
    }

    const newSpaceId = response.data?.newSpaceId;
    await refreshUserSpaceCaches();
    activePromptSeenKeyRef.current = null;
    setTutorialPromptType(null);
    setTutorialUpdatePrompt(null);

    if (typeof newSpaceId === "number" && newSpaceId > 0) {
      navigate(`/chat/${newSpaceId}`);
    }
  }, [navigate, pullMutation, refreshUserSpaceCaches]);

  return {
    tutorialUpdatePrompt,
    tutorialPromptType,
    isPullingTutorialUpdate: pullMutation.isPending,
    closeTutorialUpdatePrompt,
    confirmTutorialUpdatePull,
  };
}

