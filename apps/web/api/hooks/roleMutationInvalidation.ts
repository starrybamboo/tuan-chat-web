import { invalidateRoleMetadataBatchQueries } from "@tuanchat/query/metadata";

type QueryInvalidator = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => unknown;
};

export function invalidateUserRoleListQueries(queryClient: QueryInvalidator) {
  invalidateRoleMetadataBatchQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByType"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
  queryClient.invalidateQueries({ queryKey: ["getRole"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });
  queryClient.invalidateQueries({ queryKey: ["getDeletedUserRolesPage"] });
}

export function invalidateRoleCreateQueries(
  queryClient: QueryInvalidator,
  spaceId?: number | null,
) {
  invalidateUserRoleListQueries(queryClient);

  if (typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0) {
    queryClient.invalidateQueries({ queryKey: ["spaceRole", spaceId] });
  }
}

export function invalidateUpdatedRoleQueries(
  queryClient: QueryInvalidator,
  roleId?: number | null,
) {
  invalidateUserRoleListQueries(queryClient);
  queryClient.invalidateQueries({ queryKey: ["roomRoles"] });
  queryClient.invalidateQueries({ queryKey: ["roomRole"] });
  queryClient.invalidateQueries({ queryKey: ["roomNpcRole"] });

  if (typeof roleId === "number" && Number.isFinite(roleId) && roleId > 0) {
    queryClient.invalidateQueries({ queryKey: ["getRole", roleId] });
    queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", roleId] });
  }
}
