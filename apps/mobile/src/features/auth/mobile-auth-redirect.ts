export type MobileAuthHref = "/(auth)/login" | "/(tabs)";

type ResolveMobileAuthRedirectInput = {
  authenticatedHref?: MobileAuthHref | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  unauthenticatedHref?: MobileAuthHref | null;
};

/**
 * Resolves the post-auth route for mobile screens once the auth session has
 * finished bootstrapping. Returns `null` while bootstrapping or when the
 * current route should remain visible.
 */
export function resolveMobileAuthRedirect({
  authenticatedHref = null,
  isAuthenticated,
  isBootstrapping,
  unauthenticatedHref = null,
}: ResolveMobileAuthRedirectInput) {
  if (isBootstrapping) {
    return null;
  }

  return isAuthenticated ? authenticatedHref : unauthenticatedHref;
}
