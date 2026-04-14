type QueryInvalidator = {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => unknown;
};

export function invalidateRoleCreateQueries(
  queryClient: QueryInvalidator,
  spaceId?: number | null,
) {
  queryClient.invalidateQueries({ queryKey: ["roleInfinite"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRolesByTypes"] });
  queryClient.invalidateQueries({ queryKey: ["getRole"] });
  queryClient.invalidateQueries({ queryKey: ["getUserRoles"] });

  if (typeof spaceId === "number" && Number.isFinite(spaceId) && spaceId > 0) {
    queryClient.invalidateQueries({ queryKey: ["spaceRole", spaceId] });
    queryClient.invalidateQueries({ queryKey: ["spaceRepositoryRole", spaceId] });
  }
}
