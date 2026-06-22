import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

function readAppFile(path: string) {
  return readFileSync(resolve(workspaceRoot, path), "utf8");
}

describe("internal navigation source guard", () => {
  it("keeps converted same-tab internal CTAs on TanStack Link", () => {
    const loggedInView = readAppFile("apps/web/app/components/auth/LoggedInView.tsx");

    expect(loggedInView).toContain("import { Link } from \"@tanstack/react-router\"");
    expect(loggedInView).toContain("<Link to=\"/\" className=\"btn btn-primary w-full gap-2\">");
    expect(loggedInView).not.toContain("<a href=\"/\"");
  });

  it("keeps imperative internal navigation off window.location.href", () => {
    const userAvatar = readAppFile("apps/web/app/components/common/userAvatar.tsx");

    expect(userAvatar).toContain("useNavigate");
    expect(userAvatar).toContain("buildUserProfileNavigation");
    expect(userAvatar).not.toContain("window.location.href");
  });
});
