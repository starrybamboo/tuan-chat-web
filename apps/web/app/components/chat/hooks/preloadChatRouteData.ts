import type { QueryClient } from "@tanstack/react-query";

import {
  fetchRoomAllRoleWithCache,
  fetchUserActiveSpacesWithCache,
  fetchUserRoomsWithCache,
} from "api/hooks/chatQueryHooks";

import { parsePositiveNumber } from "./chatPageRouteUtils";

type ChatRoutePreloadParams = {
  spaceId?: string;
  roomId?: string;
};

export function preloadChatRouteData(
  queryClient: QueryClient,
  params: ChatRoutePreloadParams = {},
) {
  const requests: Array<Promise<unknown>> = [
    fetchUserActiveSpacesWithCache(queryClient),
  ];
  const activeSpaceId = parsePositiveNumber(params.spaceId);
  if (activeSpaceId) {
    requests.push(
      fetchUserRoomsWithCache(queryClient, activeSpaceId),
    );
  }

  const activeRoomId = parsePositiveNumber(params.roomId);
  if (activeRoomId) {
    requests.push(
      fetchRoomAllRoleWithCache(queryClient, activeRoomId),
    );
  }

  void Promise.allSettled(requests);
  return null;
}
