import type { NavigateFunction } from "react-router";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TutorialBootstrapResponse } from "api/hooks/tutorialOnboardingHooks";

import {
  useTutorialBootstrapMutation,
  useTutorialPullMutation,
} from "api/hooks/tutorialOnboardingHooks";

const TUTORIAL_PROMPT_SEEN_STORAGE_KEY = "tc:tutorial:onboarding:seen";

type TutorialPromptType = "missing" | "update";

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
  closeTutorialUpdatePrompt: () => void;
  confirmTutorialUpdatePull: () => Promise<void>;
};

export default function useTutorialOnboarding({
  userId,
  enabled,
  navigate,
}: UseTutorialOnboardingParams): UseTutorialOnboardingResult {
  const queryClient = useQueryClient();
  const bootstrapMutation = useTutorialBootstrapMutation();
  const pullMutation = useTutorialPullMutation();
  const bootstrappedUserIdRef = useRef<number | null>(null);
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
    if (!enabled || userId <= 0) {
      return;
    }
    if (bootstrappedUserIdRef.current === userId || bootstrapMutation.isPending) {
      return;
    }
    bootstrappedUserIdRef.current = userId;

    bootstrapMutation.mutate(undefined, {
      onSuccess: async (response) => {
        if (!response?.success) {
          return;
        }
        const data = response.data;
        if (!data?.enabled) {
          return;
        }
        activePromptSeenKeyRef.current = null;

        if (data.missingTutorial) {
          const seenKey = buildTutorialPromptSeenKey(userId, "missing", data);
          if (hasSeenTutorialPrompt(seenKey)) {
            return;
          }
          activePromptSeenKeyRef.current = seenKey;
          setTutorialPromptType("missing");
          setTutorialUpdatePrompt(data);
          return;
        }

        if (data.updateAvailable) {
          const seenKey = buildTutorialPromptSeenKey(userId, "update", data);
          if (hasSeenTutorialPrompt(seenKey)) {
            return;
          }
          activePromptSeenKeyRef.current = seenKey;
          setTutorialPromptType("update");
          setTutorialUpdatePrompt(data);
        }
      },
      onError: () => {
        // 失败后允许下一次重新尝试。
        bootstrappedUserIdRef.current = null;
      },
    });
  }, [bootstrapMutation, enabled, navigate, refreshUserSpaceCaches, userId]);

  const closeTutorialUpdatePrompt = useCallback(() => {
    markTutorialPromptSeen(activePromptSeenKeyRef.current);
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
