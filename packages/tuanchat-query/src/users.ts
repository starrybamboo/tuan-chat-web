import type { QueryClient } from "@tanstack/react-query";
import type { ApiResultUserInfoResponse } from "@tuanchat/openapi-client/models/ApiResultUserInfoResponse";
import type { UserUpdateInfoRequest } from "@tuanchat/openapi-client/models/UserUpdateInfoRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bindCancelablePromiseToSignal } from "./cancelable";
import { invalidateClientMetadataBatchQueries } from "./metadata";
import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

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
    queryFn: ({ signal }) => bindCancelablePromiseToSignal(client.userController.getUserInfo(userId), signal),
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
    queryFn: ({ signal }) => bindCancelablePromiseToSignal(client.userController.getMyUserInfo(), signal),
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

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildUserProfilePatch(request: UserUpdateInfoRequest) {
  const patch: Record<string, unknown> = {};
  for (const key of ["username", "avatarFileId", "description", "gender"] as const) {
    if (request[key] != null) {
      patch[key] = request[key];
    }
  }
  return patch;
}

export function patchUserCacheValue(current: unknown, request: UserUpdateInfoRequest): unknown {
  if (Array.isArray(current)) {
    let changed = false;
    const next = current.map((item) => {
      const patched = patchUserCacheValue(item, request);
      changed ||= patched !== item;
      return patched;
    });
    return changed ? next : current;
  }
  if (!isRecord(current)) {
    return current;
  }
  const profilePatch = buildUserProfilePatch(request);
  if (current.userId === request.userId) {
    return {
      ...current,
      ...profilePatch,
      ...(request.extra ? { extra: { ...(isRecord(current.extra) ? current.extra : {}), ...request.extra } } : {}),
    };
  }

  let next = current;
  for (const key of ["data", "list"] as const) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    const patched = patchUserCacheValue(current[key], request);
    if (patched !== current[key]) {
      next = { ...next, [key]: patched };
    }
  }
  if (isRecord(current.users)) {
    const userKey = String(request.userId);
    const user = current.users[userKey];
    if (isRecord(user)) {
      next = {
        ...next,
        users: {
          ...current.users,
          [userKey]: patchUserCacheValue(user, request),
        },
      };
    }
  }
  return next;
}

function patchDirectMessageUser(current: unknown, request: UserUpdateInfoRequest): unknown {
  if (!Array.isArray(current)) {
    return current;
  }
  const profilePatch = buildUserProfilePatch(request);
  return current.map((message) => {
    if (!isRecord(message)) {
      return message;
    }
    let next = message;
    if (message.senderId === request.userId) {
      next = {
        ...next,
        ...(profilePatch.username !== undefined ? { senderUsername: profilePatch.username } : {}),
        ...(profilePatch.avatarFileId !== undefined ? { senderAvatarFileId: profilePatch.avatarFileId } : {}),
      };
    }
    if (message.receiverId === request.userId) {
      next = {
        ...next,
        ...(profilePatch.username !== undefined ? { receiverUsername: profilePatch.username } : {}),
        ...(profilePatch.avatarFileId !== undefined ? { receiverAvatarFileId: profilePatch.avatarFileId } : {}),
      };
    }
    return next;
  });
}

export function beginUserInfoUpdateOptimisticMutation(queryClient: QueryClient, request: UserUpdateInfoRequest) {
  const prefixes = [
    ["getUserInfo"],
    ["getUserProfileInfo"],
    ["getMyUserInfo"],
    ["getUserInfoByUsername"],
    ["clientMetadataBatch"],
    ["friends"],
    ["blacklist"],
    ["userFollowers"],
    ["userFollowings"],
  ] as const;
  return beginOptimisticQueryTransaction(queryClient, [
    ...prefixes.map(queryKey => optimisticQueryPatch<unknown>({
      queryKey,
      exact: false,
      update: current => patchUserCacheValue(current, request),
    })),
    optimisticQueryPatch<unknown>({
      queryKey: ["dmInbox"],
      exact: false,
      update: current => patchDirectMessageUser(current, request),
    }),
  ]);
}

export function useUpdateUserInfoMutation(client: UserClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UserUpdateInfoRequest) => client.userController.updateUserInfo(request),
    mutationKey: ["updateUserInfo"],
    onMutate: request => beginUserInfoUpdateOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: () => {
      invalidateClientMetadataBatchQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["getUserInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getUserProfileInfo"] });
      queryClient.invalidateQueries({ queryKey: getMyUserInfoQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["getUserInfoByUsername"] });
    },
  });
}
