import type { ApiResultUserInfoResponse } from "@tuanchat/openapi-client/models/ApiResultUserInfoResponse";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import { useQuery } from "@tanstack/react-query";

export interface UserQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
}

type UserClient = Pick<TuanChat, "userController">;

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
    staleTime: options?.staleTime ?? 600_000,
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && userId > 0,
  });
}

export function useGetUserProfileQuery(client: UserClient, userId: number, options?: UserQueryOptions) {
  return useQuery({
    queryKey: getUserProfileInfoQueryKey(userId),
    queryFn: () => client.userController.getUserProfileInfo(userId),
    staleTime: options?.staleTime ?? 600_000,
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
    staleTime: options.staleTime ?? 600_000,
    refetchOnMount: options.refetchOnMount,
    enabled: options.enabled ?? true,
  });
}

export function useGetUserInfoByUsernameQuery(client: UserClient, username: string) {
  const trimmed = username.trim();
  return useQuery({
    queryKey: getUserInfoByUsernameQueryKey(trimmed),
    queryFn: () => client.userController.getUserInfoByUsername(trimmed) as Promise<ApiResultUserInfoResponse>,
    staleTime: 600_000,
    enabled: trimmed.length > 0,
  });
}
