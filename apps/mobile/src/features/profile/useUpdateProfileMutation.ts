import type { UserUpdateInfoRequest } from "@tuanchat/openapi-client/models/UserUpdateInfoRequest";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UserUpdateInfoRequest) =>
      mobileApiClient.userController.updateUserInfo(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["getMyUserInfo"] });
    },
  });
}
