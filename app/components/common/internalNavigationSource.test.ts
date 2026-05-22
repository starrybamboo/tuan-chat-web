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
    const scrollDemo = readAppFile("app/routes/scroll-sequence-demo.tsx");

    expect(loggedInView).toContain("import { Link } from \"@tanstack/react-router\"");
    expect(loggedInView).toContain("<Link to=\"/\" className=\"btn btn-primary\">");
    expect(loggedInView).not.toContain("<a href=\"/\"");

    expect(scrollDemo).toContain("import { createFileRoute, Link } from \"@tanstack/react-router\"");
    expect(scrollDemo).toContain("<Link className=\"scroll-sequence-demo__backLink\" to=\"/\">");
    expect(scrollDemo).toContain("<Link to=\"/chat/discover/material\">探索素材</Link>");
    expect(scrollDemo).toContain("<Link to=\"/chat\">进入房间</Link>");
    expect(scrollDemo).toContain("<Link className=\"scroll-sequence-demo__primaryCta\" to=\"/chat\">");
    expect(scrollDemo).not.toContain("href=\"/chat");
  });

  it("keeps imperative internal navigation off window.location.href", () => {
    const userAvatar = readAppFile("app/components/common/userAvatar.tsx");
    const collectionPreview = readAppFile("app/components/common/collection/collectionPreview.tsx");

    expect(userAvatar).toContain("useNavigate");
    expect(userAvatar).toContain("buildUserProfileNavigation");
    expect(userAvatar).not.toContain("window.location.href");

    expect(collectionPreview).toContain("useNavigate");
    expect(collectionPreview).toContain("resolveCollectionNavigationTarget");
    expect(collectionPreview).not.toContain("window.location.href");
  });
});
