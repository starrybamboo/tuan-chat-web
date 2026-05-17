import { describe, expect, it } from "vitest";

import { resolveMobileAuthRedirect } from "./mobile-auth-redirect";

describe("resolveMobileAuthRedirect", () => {
  it("keeps the current route during auth bootstrap", () => {
    expect(resolveMobileAuthRedirect({
      authenticatedHref: "/(tabs)",
      isAuthenticated: false,
      isBootstrapping: true,
      unauthenticatedHref: "/(auth)/login",
    })).toBeNull();
  });

  it("returns the authenticated destination when a session exists", () => {
    expect(resolveMobileAuthRedirect({
      authenticatedHref: "/(tabs)",
      isAuthenticated: true,
      isBootstrapping: false,
      unauthenticatedHref: "/(auth)/login",
    })).toBe("/(tabs)");
  });

  it("returns the login destination for protected routes after sign out", () => {
    expect(resolveMobileAuthRedirect({
      isAuthenticated: false,
      isBootstrapping: false,
      unauthenticatedHref: "/(auth)/login",
    })).toBe("/(auth)/login");
  });
});
