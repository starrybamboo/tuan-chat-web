export type UseDmInboxQueryOptions = {
  enabled?: boolean;
};

export function shouldEnableDmInboxQuery(
  currentUserId: number | null,
  options: UseDmInboxQueryOptions = {},
) {
  return (options.enabled ?? true) && typeof currentUserId === "number" && currentUserId > 0;
}
