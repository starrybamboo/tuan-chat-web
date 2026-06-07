export function buildUserProfileNavigation(userId: number) {
  return {
    to: "/profile/$userId" as const,
    params: { userId: String(userId) },
  };
}
