import {
  useCreateAvatarMutation as useSharedCreateAvatarMutation,
  useDeleteAvatarMutation as useSharedDeleteAvatarMutation,
  useUpdateAvatarMutation as useSharedUpdateAvatarMutation,
} from "@tuanchat/query/roles";

import { mobileApiClient } from "@/lib/api";

export function useCreateAvatarMutation() {
  return useSharedCreateAvatarMutation(mobileApiClient);
}

export function useUpdateAvatarMutation() {
  return useSharedUpdateAvatarMutation(mobileApiClient);
}

export function useDeleteAvatarMutation() {
  return useSharedDeleteAvatarMutation(mobileApiClient);
}
