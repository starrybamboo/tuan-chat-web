import type {
  ApiResultUserInfoResponse,
} from "../models/ApiResultUserInfoResponse";
import type { UserLoginRequest } from "../models/UserLoginRequest";
import type { UserUpdateInfoRequest } from "../models/UserUpdateInfoRequest";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "../instance";

/**
 * 用户登录
 * @param onSuccess 登录成功回调
 */
export function useLoginMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (req: UserLoginRequest) => tuanchat.userController.login(req),
    mutationKey: ["login"],
    onSuccess: () => {
      onSuccess?.();
    },
  });
}

interface UserQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
}

/**
 * 获取用户必要信息
 * @param userId 用户ID
 */
export function useGetUserInfoQuery(userId: number, options?: UserQueryOptions) {
  return useQuery({
    queryKey: ["getUserInfo", userId],
    queryFn: () => tuanchat.userController.getUserInfo(userId),
    staleTime: options?.staleTime ?? 600000, // 默认10分钟缓存
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && userId > 0,
  });
}

/**
 * 获取用户主页信息（公开展示）
 * @param userId 用户ID
 */
export function useGetUserProfileQuery(userId: number, options?: UserQueryOptions) {
  return useQuery({
    queryKey: ["getUserProfileInfo", userId],
    queryFn: () => tuanchat.userController.getUserProfileInfo(userId),
    staleTime: options?.staleTime ?? 600000, // 默认10分钟缓存
    refetchOnMount: options?.refetchOnMount,
    enabled: (options?.enabled ?? true) && userId > 0,
  });
}

/**
 * 获取当前登录用户信息（仅本人）
 */
export function useGetMyUserInfoQuery(enabledOrOptions: boolean | UserQueryOptions = true) {
  const options = typeof enabledOrOptions === "boolean"
    ? { enabled: enabledOrOptions }
    : enabledOrOptions;
  return useQuery({
    queryKey: ["getMyUserInfo"],
    queryFn: () => tuanchat.userController.getMyUserInfo(),
    staleTime: options.staleTime ?? 600000, // 默认10分钟缓存
    refetchOnMount: options.refetchOnMount,
    enabled: options.enabled ?? true,
  });
}

/**
 * 通过用户名获取用户必要信息
 * @param username 用户名
 */
export function useGetUserInfoByUsernameQuery(username: string) {
  const trimmed = username.trim();
  return useQuery({
    queryKey: ["getUserInfoByUsername", trimmed],
    queryFn: () => tuanchat.userController.getUserInfoByUsername(trimmed) as Promise<ApiResultUserInfoResponse>,
    staleTime: 600000,
    enabled: trimmed.length > 0,
  });
}

/**
 * 修改用户信息
 */
export function useUpdateUserInfoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: UserUpdateInfoRequest) => tuanchat.userController.updateUserInfo(req),
    mutationKey: ["updateUserInfo"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getUserInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getUserProfileInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getMyUserInfo"] });
      queryClient.invalidateQueries({ queryKey: ["getUserInfoByUsername"] });
    },
  });
}
