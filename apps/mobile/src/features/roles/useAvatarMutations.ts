import { mobileApiClient } from "@/lib/api";
import {
  useCreateAvatarMutation as useSharedCreateAvatarMutation,
  useDeleteAvatarMutation as useSharedDeleteAvatarMutation,
  useUpdateAvatarMutation as useSharedUpdateAvatarMutation,
} from "@tuanchat/query/roles";

export function useCreateAvatarMutation() {
  return useSharedCreateAvatarMutation(mobileApiClient);
}

export function useUpdateAvatarMutation() {
  return useSharedUpdateAvatarMutation(mobileApiClient);
}

export function useDeleteAvatarMutation() {
  return useSharedDeleteAvatarMutation(mobileApiClient);
}
