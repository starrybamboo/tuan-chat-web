import { mobileApiClient } from "@/lib/api";
import { useUpdateUserInfoMutation } from "@tuanchat/query/users";

export function useUpdateProfileMutation() {
  return useUpdateUserInfoMutation(mobileApiClient);
}
