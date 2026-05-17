import type { RoleCreateRequest } from "@tuanchat/openapi-client/models/RoleCreateRequest";
import type { RoleUpdateRequest } from "@tuanchat/openapi-client/models/RoleUpdateRequest";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mobileApiClient } from "@/lib/api";

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RoleCreateRequest) =>
      mobileApiClient.roleController.createRole(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myRoles"] });
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RoleUpdateRequest) =>
      mobileApiClient.roleController.updateRole(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myRoles"] });
    },
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleIds: number[]) =>
      mobileApiClient.roleController.deleteRole1(roleIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myRoles"] });
    },
  });
}
