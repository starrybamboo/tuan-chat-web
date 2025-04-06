import { useQuery } from "@tanstack/react-query";

import { tuanchat } from "api/instance";

export function useUserInfoQuery(userId: number) {
  return useQuery({
    queryKey: ["avatarController.getUserAvatar", userId],
    queryFn: () => tuanchat.userController.getUserInfo(userId),
    staleTime: 600000,
  });
}
