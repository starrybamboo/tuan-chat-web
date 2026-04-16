import type { UserUpdateInfoRequest } from "@tuanchat/openapi-client/models/UserUpdateInfoRequest";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useGetMyUserInfoQuery as useSharedGetMyUserInfoQuery,
  useGetUserInfoByUsernameQuery as useSharedGetUserInfoByUsernameQuery,
  useGetUserInfoQuery as useSharedGetUserInfoQuery,
  useGetUserProfileQuery as useSharedGetUserProfileQuery,
} from "@tuanchat/query/users";
import { tuanchat } from "../instance";

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
  return useSharedGetUserInfoQuery(tuanchat, userId, options);
}

/**
 * 获取用户主页信息（公开展示）
 * @param userId 用户ID
 */
export function useGetUserProfileQuery(userId: number, options?: UserQueryOptions) {
  return useSharedGetUserProfileQuery(tuanchat, userId, options);
}

/**
 * 获取当前登录用户信息（仅本人）
 */
export function useGetMyUserInfoQuery(enabledOrOptions: boolean | UserQueryOptions = true) {
  return useSharedGetMyUserInfoQuery(tuanchat, enabledOrOptions);
}

/**
 * 通过用户名获取用户必要信息
 * @param username 用户名
 */
export function useGetUserInfoByUsernameQuery(username: string) {
  return useSharedGetUserInfoByUsernameQuery(tuanchat, username);
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

