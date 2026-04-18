import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import { BlocksuiteRemoteImageBlobSource } from "../space/runtime/blocksuiteRemoteImageBlobSource";
import { SpaceWorkspace } from "../space/runtime/spaceWorkspace";

const { blobEngineCtorArgs } = vi.hoisted(() => ({
  blobEngineCtorArgs: [] as Array<{ main: unknown; shadows: unknown[]; logger: unknown }>,
}));

vi.mock("@/components/chat/infra/blocksuite/manager/store", () => ({
  BLOCKSUITE_STORE_EXTENSIONS: [],
}));

vi.mock("@/components/chat/infra/blocksuite/space/runtime/remoteDocSource", () => ({
  RemoteSnapshotDocSource: class {
    pull = vi.fn();
    push = vi.fn();
  },
}));

vi.mock("@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient", () => ({
  blocksuiteWsClient: {
    joinDoc: vi.fn(),
    leaveDoc: vi.fn(),
    onUpdate: vi.fn(() => () => {}),
    isOpen: vi.fn(() => false),
    tryPushUpdateIfOpen: vi.fn(() => false),
  },
}));

vi.mock("api/instance", () => ({
  tuanchat: {
    ossController: {
      getUploadUrl: vi.fn(),
    },
  },
}));

vi.mock("@blocksuite/sync", () => ({
  BlobEngine: class {
    constructor(main: unknown, shadows: unknown[], logger: unknown) {
      blobEngineCtorArgs.push({ main, shadows, logger });
    }

    start() {}
    stop() {}
  },
  DocEngine: class {
    start() {}
    forceStop() {}
  },
  IndexedDBBlobSource: class {},
  IndexedDBDocSource: class {},
}));

function seedExistingDoc(workspace: SpaceWorkspace, docId: string) {
  const ydoc = new Y.Doc({ guid: docId });
  (workspace as any)._rootDoc.getMap("spaces").set(docId, ydoc);
  return ydoc;
}

describe("blocksuiteSpaceWorkspace", () => {
  afterEach(() => {
    vi.clearAllMocks();
    blobEngineCtorArgs.length = 0;
  });

  it("workspace 会接入远端图片 blob source", () => {
    const workspace = new SpaceWorkspace({ workspaceId: "space:blob" });

    expect(blobEngineCtorArgs.at(-1)?.main).toBeInstanceOf(BlocksuiteRemoteImageBlobSource);

    workspace.dispose();
  });

  it("能为已存在于 spaces map 的文档惰性 materialize doc 实例", () => {
    const workspace = new SpaceWorkspace({ workspaceId: "space:1" });
    seedExistingDoc(workspace, "room:1:description");

    const doc = workspace.getDoc("room:1:description");

    expect(doc).toBeTruthy();
    expect(workspace.docs.get("room:1:description")).toBe(doc);
    expect(workspace.meta.getDocMeta("room:1:description")).toBeTruthy();

    workspace.dispose();
  });

  it("对同一个已存在文档重复 getDoc 会复用同一实例", () => {
    const workspace = new SpaceWorkspace({ workspaceId: "space:2" });
    seedExistingDoc(workspace, "room:2:description");

    const first = workspace.getDoc("room:2:description");
    const second = workspace.getDoc("room:2:description");

    expect(first).toBe(second);
    expect(workspace.docs.size).toBe(1);

    workspace.dispose();
  });

  it("缺失文档仍然返回 null，不会掩盖真实 deleted 态", () => {
    const workspace = new SpaceWorkspace({ workspaceId: "space:3" });

    expect(workspace.getDoc("room:404:description")).toBeNull();
    expect(workspace.docs.size).toBe(0);

    workspace.dispose();
  });

  it("标题 hydration 只读取已 materialize 的 doc，不会批量 materialize meta 中的文档", async () => {
    const workspace = new SpaceWorkspace({ workspaceId: "space:4" });
    seedExistingDoc(workspace, "room:4:description");
    seedExistingDoc(workspace, "room:5:description");

    const materialized = workspace.getDoc("room:4:description");
    (materialized as any)._ready = true;

    workspace.meta.setDocMeta("room:4:description", { title: "" });
    workspace.meta.setDocMeta("room:5:description", { title: "" });

    (workspace as any)._hydrateMissingTitles();
    await Promise.resolve();
    await Promise.resolve();

    expect(workspace.docs.has("room:4:description")).toBe(true);
    expect(workspace.docs.has("room:5:description")).toBe(false);
    expect(workspace.docs.size).toBe(1);

    workspace.dispose();
  });
});
