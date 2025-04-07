import { useQuery } from "@tanstack/react-query";

import { tuanchat } from "api/instance";

export function useUserInfoQuery(userId: number) {
  return useQuery({
    queryKey: ["getUserInfo", userId],
    queryFn: () => tuanchat.service.getUserInfo(userId),
    staleTime: 600000,
  });
}
