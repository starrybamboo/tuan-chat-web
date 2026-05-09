import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => null,
  Scripts: () => React.createElement("script", { type: "module", src: "/assets/entry.js" }),
  ScrollRestoration: () => null,
  useLocation: vi.fn(),
  useMatchRoute: vi.fn(),
  useRouter: vi.fn(),
  useRouterState: vi.fn(),
}));

import { Scripts } from "./reactRouterCompat";

describe("reactRouterCompat.Scripts", () => {
  it("透传 TanStack Start 的客户端脚本注入", () => {
    const html = renderToStaticMarkup(React.createElement(Scripts));

    expect(html).toContain('type="module"');
    expect(html).toContain('src="/assets/entry.js"');
  });
});
