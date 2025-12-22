import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tuanchat } from '../instance';
import type { ApiResultUserInfoResponse, UserLoginRequest, UserInfoResponse } from 'api';

/**
 * 用户登录
 * @param onSuccess 登录成功回调
 */
export function useLoginMutation(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (req: UserLoginRequest) => tuanchat.userController.login(req),
    mutationKey: ['login'],
    onSuccess: () => {
      onSuccess?.();
    }
  });
}

/**
 * 获取用户信息
 * @param userId 用户ID
 */
export function useGetUserInfoQuery(userId: number) {
  return useQuery({
    queryKey: ['getUserInfo', userId],
    queryFn: () => tuanchat.userController.getUserInfo(userId),
    staleTime: 600000, // 10分钟缓存
    enabled: userId > 0
  });
}

/**
 * 通过用户名获取用户信息
 * @param username 用户名
 */
export function useGetUserInfoByUsernameQuery(username: string) {
  const trimmed = username.trim();
  return useQuery({
    queryKey: ['getUserInfoByUsername', trimmed],
    queryFn: async () => {
      const res = await tuanchat.request.request({
        method: 'GET',
        url: '/capi/user/info/by-username',
        query: {
          username: trimmed,
        },
        errors: {
          400: `Bad Request`,
          405: `Method Not Allowed`,
          429: `Too Many Requests`,
          500: `Internal Server Error`,
        },
      });
      return res as ApiResultUserInfoResponse;
    },
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
    mutationFn: (req: UserInfoResponse) => tuanchat.userController.updateUserInfo(req),
    mutationKey: ['updateUserInfo'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getUserInfo'] });
    }
  });
}
