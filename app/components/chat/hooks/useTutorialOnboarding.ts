import type { NavigateFunction } from "react-router";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TutorialBootstrapResponse } from "api/hooks/tutorialOnboardingHooks";

import {
  useTutorialBootstrapMutation,
  useTutorialPullMutation,
} from "api/hooks/tutorialOnboardingHooks";

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

        if (data.missingTutorial) {
          setTutorialPromptType("missing");
          setTutorialUpdatePrompt(data);
          return;
        }

        if (data.updateAvailable) {
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
