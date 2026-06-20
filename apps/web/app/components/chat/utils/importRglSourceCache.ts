import type { QueryClient } from "@tanstack/react-query";

type RglRoleAvatarCacheEntry = {
  avatarId: number;
  roleId: number;
};

export function rglMaterialImportPackagesQueryKey(spaceId: number) {
  return ["spaceMaterialPackage", "rglImportAll", spaceId] as const;
}

export async function refreshRglMaterialImportSourceCaches(queryClient: QueryClient, spaceId: number) {
  queryClient.removeQueries({
    exact: true,
    queryKey: rglMaterialImportPackagesQueryKey(spaceId),
  });
  await queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage"] });
}

export async function refreshRglRoleAvatarImportSourceCaches(
  queryClient: QueryClient,
  entries: RglRoleAvatarCacheEntry[],
) {
  const roleIds = new Set<number>();
  const avatarIds = new Set<number>();
  for (const entry of entries) {
    if (Number.isFinite(entry.roleId) && entry.roleId > 0) {
      roleIds.add(entry.roleId);
    }
    if (Number.isFinite(entry.avatarId) && entry.avatarId > 0) {
      avatarIds.add(entry.avatarId);
    }
  }

  for (const roleId of roleIds) {
    queryClient.removeQueries({ exact: true, queryKey: ["getRoleAvatars", roleId] });
  }
  for (const avatarId of avatarIds) {
    queryClient.removeQueries({ exact: true, queryKey: ["getRoleAvatar", avatarId] });
  }

  await Promise.all([
    ...Array.from(roleIds, roleId => queryClient.invalidateQueries({ exact: true, queryKey: ["getRoleAvatars", roleId] })),
    ...Array.from(avatarIds, avatarId => queryClient.invalidateQueries({ exact: true, queryKey: ["getRoleAvatar", avatarId] })),
  ]);
}
