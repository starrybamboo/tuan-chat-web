import { mobileApiClient } from "@/lib/api";
import {
  useCreateRoleMutation as useSharedCreateRoleMutation,
  useDeleteRoleMutation as useSharedDeleteRoleMutation,
  useUpdateRoleMutation as useSharedUpdateRoleMutation,
} from "@tuanchat/query/roles";

export function useCreateRoleMutation() {
  return useSharedCreateRoleMutation(mobileApiClient);
}

export function useUpdateRoleMutation() {
  return useSharedUpdateRoleMutation(mobileApiClient);
}

export function useDeleteRoleMutation() {
  return useSharedDeleteRoleMutation(mobileApiClient);
}
