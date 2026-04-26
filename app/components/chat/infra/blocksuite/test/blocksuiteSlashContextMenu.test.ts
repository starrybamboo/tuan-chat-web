import { afterEach, describe, expect, it, vi } from "vitest";

import { installBlocksuiteSlashContextMenu } from "../editors/blocksuiteSlashContextMenu";

vi.mock("@blocksuite/affine/components/context-menu", () => ({
  menu: {
    action: vi.fn(),
    group: vi.fn(),
    subMenu: vi.fn(),
  },
  popMenu: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock("@blocksuite/affine-shared/commands", () => ({
  focusBlockEnd: Symbol("focusBlockEnd"),
}));

vi.mock("@blocksuite/std", () => ({
  BlockComponent: class {},
  BlockSelection: class {},
  TextSelection: class {},
}));

vi.mock("../manager/slashMenuRuntime", () => ({
  groupBlocksuiteSlashMenuItems: vi.fn(() => []),
  resolveBlocksuiteSlashMenuItems: vi.fn(() => []),
}));

describe("blocksuiteSlashContextMenu", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("安装阶段不会在 render 前访问 host.selection", () => {
    let hostReadCount = 0;
    const listeners = new Map<string, EventListener>();
    const editor = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        listeners.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string) => {
        listeners.delete(event);
      }),
      std: {
        get host() {
          hostReadCount += 1;
          throw new Error("host should not be read during install");
        },
      },
    } as any;

    const dispose = installBlocksuiteSlashContextMenu(editor);

    expect(hostReadCount).toBe(0);
    expect(typeof listeners.get("contextmenu")).toBe("function");

    dispose();
  });
});
