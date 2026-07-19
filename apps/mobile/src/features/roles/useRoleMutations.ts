import {
  useCreateRoleMutation as useSharedCreateRoleMutation,
  useDeleteRoleMutation as useSharedDeleteRoleMutation,
  useUpdateRoleMutation as useSharedUpdateRoleMutation,
} from "@tuanchat/query/roles";

import { mobileApiClient } from "@/lib/api";

export function useCreateRoleMutation() {
  return useSharedCreateRoleMutation(mobileApiClient);
}

export function useUpdateRoleMutation() {
  return useSharedUpdateRoleMutation(mobileApiClient);
}

export function useDeleteRoleMutation() {
  return useSharedDeleteRoleMutation(mobileApiClient);
}
