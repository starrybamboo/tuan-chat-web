import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let lastEditorProps: Record<string, unknown> | null = null;

const mockUseSpaceMaterialPackagesQuery = vi.fn();
const mockUseUpdateSpaceMaterialPackageMutation = vi.fn();
const mockUseDeleteSpaceMaterialPackageMutation = vi.fn();

vi.mock("../../../../../api/hooks/materialPackageQueryHooks", () => ({
  useSpaceMaterialPackagesQuery: (...args: unknown[]) => mockUseSpaceMaterialPackagesQuery(...args),
  useUpdateSpaceMaterialPackageMutation: (...args: unknown[]) => mockUseUpdateSpaceMaterialPackageMutation(...args),
  useDeleteSpaceMaterialPackageMutation: (...args: unknown[]) => mockUseDeleteSpaceMaterialPackageMutation(...args),
}));

vi.mock("@/components/material/components/materialPackageEditor", () => ({
  default: (props: Record<string, unknown>) => {
    lastEditorProps = props;
    return createElement("div", null, "mock-editor");
  },
}));

import SpaceMaterialSubWindow from "./spaceMaterialSubWindow";

describe("spaceMaterialSubWindow", () => {
  beforeEach(() => {
    lastEditorProps = null;
    mockUseUpdateSpaceMaterialPackageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseDeleteSpaceMaterialPackageMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseSpaceMaterialPackagesQuery.mockReturnValue({
      isLoading: false,
      data: {
        data: {
          list: [
            {
              spacePackageId: 12,
              name: "测试素材包",
              description: "desc",
              coverUrl: "",
              sourcePackageId: null,
              content: { root: [] },
            },
          ],
        },
      },
    });
  });

  it("在副窗口里使用外部侧栏模式", () => {
    renderToStaticMarkup(
      createElement(SpaceMaterialSubWindow, {
        spaceId: 7,
        spacePackageId: 12,
        materialPathKey: "0.1",
        onClearSelection: () => {},
      }),
    );

    expect(lastEditorProps).toMatchObject({
      sidebarActionScope: "subwindow",
      showStructureSidebar: false,
      selectedNodeKey: "0.1",
    });
  });
});
