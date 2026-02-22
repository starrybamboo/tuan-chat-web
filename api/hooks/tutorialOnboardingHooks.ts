import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "../instance";

type ApiResult<T> = {
  success?: boolean;
  errCode?: number;
  errMsg?: string;
  data?: T;
};

export type TutorialBootstrapResponse = {
  enabled?: boolean;
  tutorialRepositoryId?: number;
  latestCommitId?: number | null;
  currentSpaceId?: number | null;
  currentCommitId?: number | null;
  autoCloned?: boolean;
  newSpaceId?: number | null;
  updateAvailable?: boolean;
};

export type TutorialPullResponse = {
  tutorialRepositoryId?: number;
  newSpaceId?: number | null;
  removedSpaceIds?: number[];
  latestCommitId?: number | null;
};

export async function fetchTutorialBootstrap() {
  return await tuanchat.request.request({
    method: "GET",
    url: "/space/tutorial/bootstrap",
  }) as ApiResult<TutorialBootstrapResponse>;
}

export async function pullLatestTutorial() {
  return await tuanchat.request.request({
    method: "POST",
    url: "/space/tutorial/pull",
  }) as ApiResult<TutorialPullResponse>;
}

export function useTutorialBootstrapMutation() {
  return useMutation({
    mutationKey: ["tutorialBootstrap"],
    mutationFn: fetchTutorialBootstrap,
  });
}

export function useTutorialPullMutation() {
  return useMutation({
    mutationKey: ["tutorialPullLatest"],
    mutationFn: pullLatestTutorial,
  });
}
