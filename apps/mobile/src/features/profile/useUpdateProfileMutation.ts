import { useUpdateUserInfoMutation } from "@tuanchat/query/users";

import { mobileApiClient } from "@/lib/api";

export function useUpdateProfileMutation() {
  return useUpdateUserInfoMutation(mobileApiClient);
}
