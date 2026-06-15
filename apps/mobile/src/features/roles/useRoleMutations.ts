import {
  useClearRoleTrashMutation as useSharedClearRoleTrashMutation,
  useCreateRoleMutation as useSharedCreateRoleMutation,
  useDeleteRoleMutation as useSharedDeleteRoleMutation,
  useHardDeleteRolesMutation as useSharedHardDeleteRolesMutation,
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

export function useHardDeleteRolesMutation() {
  return useSharedHardDeleteRolesMutation(mobileApiClient);
}

export function useClearRoleTrashMutation() {
  return useSharedClearRoleTrashMutation(mobileApiClient);
}
