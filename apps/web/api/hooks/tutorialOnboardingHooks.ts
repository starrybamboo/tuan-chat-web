import { useMutation } from "@tanstack/react-query";
import type {
  ApiResultTutorialBootstrapResponse,
  ApiResultTutorialPullResponse,
} from "api";
import { tuanchat } from "../instance";

export type { TutorialBootstrapResponse } from "api";

export async function fetchTutorialBootstrap() {
  return await tuanchat.spaceTutorialController.bootstrap() as ApiResultTutorialBootstrapResponse;
}

async function pullLatestTutorial() {
  return await tuanchat.spaceTutorialController.pullLatestTutorial() as ApiResultTutorialPullResponse;
}

export function useTutorialPullMutation() {
  return useMutation({
    mutationKey: ["tutorialPullLatest"],
    mutationFn: pullLatestTutorial,
  });
}
