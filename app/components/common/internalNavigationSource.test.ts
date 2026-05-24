import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readAppFile(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("internal navigation source guard", () => {
  it("keeps converted same-tab internal CTAs on TanStack Link", () => {
    const loggedInView = readAppFile("app/components/auth/LoggedInView.tsx");

    expect(loggedInView).toContain("import { Link } from \"@tanstack/react-router\"");
    expect(loggedInView).toContain("<Link to=\"/\" className=\"btn btn-primary\">");
    expect(loggedInView).not.toContain("<a href=\"/\"");
  });

  it("keeps imperative internal navigation off window.location.href", () => {
    const userAvatar = readAppFile("app/components/common/userAvatar.tsx");

    expect(userAvatar).toContain("useNavigate");
    expect(userAvatar).toContain("buildUserProfileNavigation");
    expect(userAvatar).not.toContain("window.location.href");
  });
});
