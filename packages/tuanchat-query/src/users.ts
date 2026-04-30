import type { QueryClient } from "@tanstack/react-query";

import { useQuery } from "@tanstack/react-query";

import type { ApiResultUserInfoResponse } from "@tuanchat/openapi-client/models/ApiResultUserInfoResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

export type UserQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
};

type UserClient = Pick<TuanChat, "userController">;
export const USER_INFO_STALE_TIME_MS = 600_000;

export function getUserInfoQueryKey(userId: number) {
  return ["getUserInfo", userId] as const;
}

export function getUserProfileInfoQueryKey(userId: number) {
  return ["getUserProfileInfo", userId] as const;
}

export function getMyUserInfoQueryKey() {
  return ["getMyUserInfo"] as const;
}

export function getUserInfoByUsernameQueryKey(username: string) {
  return ["getUserInfoByUsername", username.trim()] as const;
}

export function useGetUserInfoQuery(client: UserClient, userId: number, options?: UserQueryOptions) {
  return useQuery({
    queryKey: getUserInfoQueryKey(userId),
    queryFn: () => client.userController.getUserInfo(userId),
    staleTime: options?.staleTime ?? USER_INFO_STALE_TIME_MS,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && userId > 0,
  });
}

export function useGetUserProfileQuery(client: UserClient, userId: number, options?: UserQueryOptions) {
  return useQuery({
    queryKey: getUserProfileInfoQueryKey(userId),
    queryFn: () => client.userController.getUserProfileInfo(userId),
    staleTime: options?.staleTime ?? USER_INFO_STALE_TIME_MS,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && userId > 0,
  });
}

export function useGetMyUserInfoQuery(client: UserClient, enabledOrOptions: boolean | UserQueryOptions = true) {
  const options = typeof enabledOrOptions === "boolean"
    ? { enabled: enabledOrOptions }
    : enabledOrOptions;

  return useQuery({
    queryKey: getMyUserInfoQueryKey(),
    queryFn: () => client.userController.getMyUserInfo(),
    staleTime: options.staleTime ?? USER_INFO_STALE_TIME_MS,
    refetchOnMount: options.refetchOnMount,
    enabled: options.enabled ?? true,
  });
}

export function useGetUserInfoByUsernameQuery(client: UserClient, username: string) {
  const trimmed = username.trim();
  return useQuery({
    queryKey: getUserInfoByUsernameQueryKey(trimmed),
    queryFn: () => client.userController.getUserInfoByUsername(trimmed) as Promise<ApiResultUserInfoResponse>,
    staleTime: USER_INFO_STALE_TIME_MS,
    enabled: trimmed.length > 0,
  });
}

export function fetchUserInfoWithCache(queryClient: QueryClient, client: UserClient, userId: number, options?: UserQueryOptions) {
  return queryClient.fetchQuery({
    queryKey: getUserInfoQueryKey(userId),
    queryFn: () => client.userController.getUserInfo(userId),
    staleTime: options?.staleTime ?? USER_INFO_STALE_TIME_MS,
  });
}

export function fetchMyUserInfoWithCache(queryClient: QueryClient, client: UserClient, options?: UserQueryOptions) {
  return queryClient.fetchQuery({
    queryKey: getMyUserInfoQueryKey(),
    queryFn: () => client.userController.getMyUserInfo(),
    staleTime: options?.staleTime ?? USER_INFO_STALE_TIME_MS,
  });
}
