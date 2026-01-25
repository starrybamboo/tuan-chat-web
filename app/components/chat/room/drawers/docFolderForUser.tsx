import type { SpaceUserDocResponse } from "../../../../../api/models/SpaceUserDocResponse";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { DotsThreeVerticalIcon, FolderPlusIcon, PlusIcon } from "@phosphor-icons/react";
import {
  useCreateSpaceUserDocMutation,
  useDeleteSpaceUserDocMutation,
  useGetSpaceUserDocFolderTreeQuery,
  useListSpaceUserDocsQuery,
  useRenameSpaceUserDocMutation,
  useSetSpaceUserDocFolderTreeMutation,
} from "api/hooks/spaceUserDocFolderHooks";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";

interface DocFolderDocNode {
  nodeId: string;
  type: "doc";
  targetId: number;
}

interface DocFolderCategoryNode {
  categoryId: string;
  name: string;
  collapsed?: boolean;
  items: DocFolderDocNode[];
}

interface DocFolderTree {
  schemaVersion: 1;
  categories: DocFolderCategoryNode[];
}

function generateCategoryId(): string {
  return `cat:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function buildDefaultTree(): DocFolderTree {
  return {
    schemaVersion: 1,
    categories: [
      {
        categoryId: "cat:docs",
        name: "我的文档",
        items: [],
      },
    ],
  };
}

function buildDocNode(docId: number): DocFolderDocNode {
  return { nodeId: `doc:${docId}`, type: "doc", targetId: docId };
}

function normalizeDocId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0)
    return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0)
      return n;
  }
  return null;
}

function tryParseTree(treeJson: string | null | undefined): DocFolderTree | null {
  if (!treeJson || treeJson.trim().length === 0)
    return null;

  try {
    const raw = JSON.parse(treeJson) as any;
    if (!raw || !Array.isArray(raw.categories))
      return null;

    const categories: DocFolderCategoryNode[] = [];
    for (const c of raw.categories) {
      if (!c)
        continue;
      const categoryId = typeof c.categoryId === "string" && c.categoryId.trim().length > 0 ? c.categoryId : generateCategoryId();
      const name = typeof c.name === "string" && c.name.trim().length > 0 ? c.name.trim() : "未命名";
      const collapsed = Boolean(c.collapsed);
      const items: DocFolderDocNode[] = [];
      for (const it of (Array.isArray(c.items) ? c.items : [])) {
        if (!it || it.type !== "doc")
          continue;
        const docId = normalizeDocId(it.targetId);
        if (!docId)
          continue;
        items.push(buildDocNode(docId));
      }
      categories.push({ categoryId, name, collapsed, items });
    }

    return {
      schemaVersion: 1,
      categories,
    };
  }
  catch {
    return null;
  }
}

function normalizeTree(params: {
  tree: DocFolderTree | null;
  docs: SpaceUserDocResponse[];
}): DocFolderTree {
  const docIdSet = new Set<number>();
  for (const d of params.docs) {
    const id = d?.docId;
    if (typeof id === "number" && Number.isFinite(id) && id > 0)
      docIdSet.add(id);
  }

  const base = params.tree ?? buildDefaultTree();
  const usedCategoryIds = new Set<string>();
  const usedNodeIds = new Set<string>();
  const usedDocIds = new Set<number>();

  const categories: DocFolderCategoryNode[] = [];
  for (const c of base.categories ?? []) {
    if (!c)
      continue;
    let categoryId = typeof c.categoryId === "string" && c.categoryId.trim().length > 0 ? c.categoryId : generateCategoryId();
    if (usedCategoryIds.has(categoryId))
      categoryId = generateCategoryId();
    usedCategoryIds.add(categoryId);

    const name = typeof c.name === "string" && c.name.trim().length > 0 ? c.name.trim() : "未命名";
    const collapsed = Boolean(c.collapsed);

    const items: DocFolderDocNode[] = [];
    for (const n of c.items ?? []) {
      if (!n || n.type !== "doc")
        continue;
      const docId = normalizeDocId(n.targetId);
      if (!docId || !docIdSet.has(docId))
        continue;
      const nodeId = `doc:${docId}`;
      if (usedNodeIds.has(nodeId))
        continue;
      usedNodeIds.add(nodeId);
      usedDocIds.add(docId);
      items.push(buildDocNode(docId));
    }
    categories.push({ categoryId, name, collapsed, items });
  }

  if (categories.length === 0) {
    categories.push({ categoryId: "cat:docs", name: "我的文档", items: [] });
  }

  // 把“存在于后端列表，但不在树里”的文档自动补到第一个分类，避免“文档消失”
  const missing = [...docIdSet].filter(id => !usedDocIds.has(id));
  if (missing.length) {
    categories[0] = {
      ...categories[0],
      items: [...categories[0].items, ...missing.map(buildDocNode)],
    };
  }

  return { schemaVersion: 1, categories };
}

function formatDateTime(raw: string | null | undefined): string {
  if (!raw)
    return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime()))
    return raw;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DocFolderForUser() {
  const spaceContext = use(SpaceContext);
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const spaceId = spaceContext.spaceId ?? -1;

  const setSideDrawerState = useSideDrawerStore(state => state.setState);

  const treeQuery = useGetSpaceUserDocFolderTreeQuery(spaceId);
  const docsQuery = useListSpaceUserDocsQuery(spaceId);

  const setTreeMutation = useSetSpaceUserDocFolderTreeMutation();
  const createDocMutation = useCreateSpaceUserDocMutation();
  const renameDocMutation = useRenameSpaceUserDocMutation();
  const deleteDocMutation = useDeleteSpaceUserDocMutation();

  const serverTree = treeQuery.data?.data ?? undefined;
  const serverVersion = serverTree?.version ?? 0;
  const serverTreeJson = serverTree?.treeJson ?? null;

  const docs = useMemo(() => {
    if (!docsQuery.data?.success)
      return [] as SpaceUserDocResponse[];
    return Array.isArray(docsQuery.data?.data) ? docsQuery.data!.data! : [];
  }, [docsQuery.data]);

  const docById = useMemo(() => {
    const map = new Map<number, SpaceUserDocResponse>();
    for (const d of docs) {
      if (typeof d?.docId === "number")
        map.set(d.docId, d);
    }
    return map;
  }, [docs]);

  const normalizedFromServer = useMemo(() => {
    const parsed = tryParseTree(serverTreeJson);
    return normalizeTree({ tree: parsed, docs });
  }, [docs, serverTreeJson]);

  const [tree, setTree] = useState<DocFolderTree>(normalizedFromServer);
  const versionRef = useRef<number>(serverVersion);

  useEffect(() => {
    versionRef.current = serverVersion;
  }, [serverVersion]);

  useEffect(() => {
    setTree(normalizedFromServer);
  }, [normalizedFromServer, spaceId]);

  const persistTree = useCallback(async (next: DocFolderTree) => {
    if (!spaceId || spaceId <= 0)
      return;

    const expectedVersion = versionRef.current ?? 0;
    try {
      const res = await setTreeMutation.mutateAsync({
        spaceId,
        expectedVersion,
        treeJson: JSON.stringify(next),
      });
      if (!res?.success) {
        toast.error(res?.errMsg ?? "保存文档夹失败");
        treeQuery.refetch();
        return;
      }
      versionRef.current = res.data?.version ?? expectedVersion + 1;
    }
    catch (err) {
      console.error("[DocFolderForUser] setTree failed", err);
      toast.error("保存文档夹失败");
      treeQuery.refetch();
    }
  }, [setTreeMutation, spaceId, treeQuery]);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategoryId, setNewDocCategoryId] = useState<string>("cat:docs");

  const [renameDocOpen, setRenameDocOpen] = useState(false);
  const [renameDocId, setRenameDocId] = useState<number | null>(null);
  const [renameDocTitle, setRenameDocTitle] = useState("");

  const [openDocId, setOpenDocId] = useState<number | null>(null);

  const openDocMeta = openDocId != null ? docById.get(openDocId) : null;
  const openDocBlocksuiteId = useMemo(() => {
    if (openDocId == null)
      return null;
    return buildDescriptionDocId({ entityType: "space_user_doc", entityId: openDocId, docType: "description" });
  }, [openDocId]);

  const editorRenameTimerRef = useRef<number | null>(null);
  const editorLatestTitleRef = useRef<string>("");

  const scheduleRenameFromEditor = useCallback((docId: number, title: string) => {
    if (typeof window === "undefined")
      return;
    if (!spaceId || spaceId <= 0)
      return;
    editorLatestTitleRef.current = title;
    if (editorRenameTimerRef.current) {
      window.clearTimeout(editorRenameTimerRef.current);
      editorRenameTimerRef.current = null;
    }
    editorRenameTimerRef.current = window.setTimeout(() => {
      editorRenameTimerRef.current = null;
      const finalTitle = editorLatestTitleRef.current.trim();
      if (!finalTitle)
        return;
      renameDocMutation.mutate({ spaceId, docId, title: finalTitle }, {
        onError: () => toast.error("更新标题失败"),
      });
    }, 700);
  }, [renameDocMutation, spaceId]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined")
        return;
      if (editorRenameTimerRef.current) {
        window.clearTimeout(editorRenameTimerRef.current);
        editorRenameTimerRef.current = null;
      }
    };
  }, []);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast.error("请输入文件夹名称");
      return;
    }

    const next: DocFolderTree = {
      ...tree,
      categories: [
        ...tree.categories,
        {
          categoryId: generateCategoryId(),
          name,
          items: [],
        },
      ],
    };
    setTree(next);
    setCreateFolderOpen(false);
    setNewFolderName("");
    await persistTree(next);
  };

  const createDoc = async () => {
    const title = newDocTitle.trim() || "新文档";
    if (!spaceId || spaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    if (!userId) {
      toast.error("未登录");
      return;
    }

    try {
      const res = await createDocMutation.mutateAsync({ spaceId, title });
      if (!res?.success || !res.data?.docId) {
        toast.error(res?.errMsg ?? "创建文档失败");
        return;
      }

      const docId = res.data.docId;
      const categoryId = tree.categories.some(c => c.categoryId === newDocCategoryId) ? newDocCategoryId : tree.categories[0]?.categoryId;
      const nextCategories = tree.categories.map((c) => {
        if (c.categoryId !== categoryId)
          return c;
        return { ...c, items: [...c.items, buildDocNode(docId)] };
      });
      const nextTree: DocFolderTree = { ...tree, categories: nextCategories };

      setTree(nextTree);
      setCreateDocOpen(false);
      setNewDocTitle("");
      await persistTree(nextTree);

      docsQuery.refetch();
      toast.success("文档已创建");
    }
    catch (err) {
      console.error("[DocFolderForUser] createDoc failed", err);
      toast.error("创建文档失败");
    }
  };

  const requestRenameDoc = (docId: number) => {
    const current = docById.get(docId);
    setRenameDocId(docId);
    setRenameDocTitle((current?.title ?? "").trim() || "新文档");
    setRenameDocOpen(true);
  };

  const submitRenameDoc = async () => {
    if (renameDocId == null)
      return;
    const title = renameDocTitle.trim();
    if (!title) {
      toast.error("请输入标题");
      return;
    }
    renameDocMutation.mutate({ spaceId, docId: renameDocId, title }, {
      onSuccess: (res) => {
        if (res?.success === false) {
          toast.error(res.errMsg ?? "重命名失败");
          return;
        }
        toast.success("标题已更新");
        docsQuery.refetch();
        setRenameDocOpen(false);
        setRenameDocId(null);
      },
      onError: () => toast.error("重命名失败"),
    });
  };

  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<number | null>(null);
  const requestDeleteDoc = (docId: number) => {
    setDeleteDocConfirmId(docId);
  };
  const confirmDeleteDoc = async () => {
    if (!spaceId || spaceId <= 0)
      return;
    if (deleteDocConfirmId == null)
      return;

    const docId = deleteDocConfirmId;
    try {
      const res = await deleteDocMutation.mutateAsync({ spaceId, docId });
      if (res?.success === false) {
        toast.error(res.errMsg ?? "删除失败");
        return;
      }

      const nextTree: DocFolderTree = {
        ...tree,
        categories: tree.categories.map(c => ({ ...c, items: c.items.filter(n => n.targetId !== docId) })),
      };
      setTree(nextTree);
      setDeleteDocConfirmId(null);
      await persistTree(nextTree);
      docsQuery.refetch();
      toast.success("已删除");
    }
    catch (err) {
      console.error("[DocFolderForUser] deleteDoc failed", err);
      toast.error("删除失败");
    }
  };

  const toggleCategory = async (categoryId: string) => {
    const next: DocFolderTree = {
      ...tree,
      categories: tree.categories.map(c => c.categoryId === categoryId ? { ...c, collapsed: !c.collapsed } : c),
    };
    setTree(next);
    await persistTree(next);
  };

  const [renameCategoryOpen, setRenameCategoryOpen] = useState(false);
  const [renameCategoryId, setRenameCategoryId] = useState<string | null>(null);
  const [renameCategoryName, setRenameCategoryName] = useState("");
  const requestRenameCategory = (categoryId: string) => {
    const current = tree.categories.find(c => c.categoryId === categoryId);
    setRenameCategoryId(categoryId);
    setRenameCategoryName(current?.name ?? "");
    setRenameCategoryOpen(true);
  };
  const submitRenameCategory = async () => {
    if (renameCategoryId == null)
      return;
    const trimmed = renameCategoryName.trim();
    if (!trimmed) {
      toast.error("文件夹名称不能为空");
      return;
    }
    const next: DocFolderTree = {
      ...tree,
      categories: tree.categories.map(c => c.categoryId === renameCategoryId ? { ...c, name: trimmed } : c),
    };
    setTree(next);
    setRenameCategoryOpen(false);
    setRenameCategoryId(null);
    await persistTree(next);
    toast.success("文件夹已更新");
  };

  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);
  const requestDeleteCategory = (categoryId: string) => {
    setDeleteCategoryConfirmId(categoryId);
  };
  const confirmDeleteCategory = async () => {
    if (deleteCategoryConfirmId == null)
      return;
    const category = tree.categories.find(c => c.categoryId === deleteCategoryConfirmId);
    if (!category)
      return;

    const remaining = tree.categories.filter(c => c.categoryId !== deleteCategoryConfirmId);
    if (remaining.length === 0) {
      toast.error("至少需要保留一个文件夹");
      return;
    }

    const moved = category.items;
    const next: DocFolderTree = {
      ...tree,
      categories: remaining.map((c, idx) => idx === 0 ? { ...c, items: [...c.items, ...moved] } : c),
    };
    setTree(next);
    setDeleteCategoryConfirmId(null);
    await persistTree(next);
    toast.success("文件夹已删除");
  };

  const isLoading = treeQuery.isLoading || docsQuery.isLoading;
  const loadFailed = (treeQuery.data && !treeQuery.data.success) || (docsQuery.data && !docsQuery.data.success);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-sm font-medium opacity-80 truncate">我的文档</div>
          <div className="text-xs opacity-60 truncate">
            {spaceId > 0 ? `Space #${spaceId}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setCreateFolderOpen(true)}
            title="新建文件夹"
          >
            <FolderPlusIcon className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={() => {
              setNewDocCategoryId(tree.categories[0]?.categoryId ?? "cat:docs");
              setCreateDocOpen(true);
            }}
            title="新建文档"
          >
            <PlusIcon className="size-4" />
            新建
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setSideDrawerState("none")}
          >
            关闭
          </button>
        </div>
      </div>

      {isLoading
        ? (
            <div className="flex-1 flex items-center justify-center opacity-70">加载中...</div>
          )
        : loadFailed
          ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
                <div className="text-sm opacity-70">加载失败</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    treeQuery.refetch();
                    docsQuery.refetch();
                  }}
                >
                  重试
                </button>
              </div>
            )
          : (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="p-2 space-y-2">
                  {tree.categories.map((cat) => {
                    const isCollapsed = Boolean(cat.collapsed);
                    return (
                      <div key={cat.categoryId} className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
                        <div className="flex items-center justify-between px-2 py-2 bg-base-200">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs min-w-0 flex-1 justify-start"
                            onClick={() => void toggleCategory(cat.categoryId)}
                          >
                            <span className="truncate">{cat.name}</span>
                            <span className="ml-2 text-xs opacity-60">
                              {cat.items.length}
                            </span>
                          </button>

                          <div className="dropdown dropdown-end">
                            <button
                              type="button"
                              tabIndex={0}
                              className="btn btn-ghost btn-xs"
                              aria-label="文件夹操作"
                            >
                              <DotsThreeVerticalIcon className="size-4" />
                            </button>
                            <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-44">
                              <li><a onClick={() => requestRenameCategory(cat.categoryId)}>重命名</a></li>
                              <li><a onClick={() => requestDeleteCategory(cat.categoryId)}>删除</a></li>
                            </ul>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="divide-y divide-base-200">
                            {cat.items.length === 0
                              ? (
                                  <div className="px-3 py-3 text-xs opacity-60">空文件夹</div>
                                )
                              : (
                                  cat.items.map((node) => {
                                    const meta = docById.get(node.targetId);
                                    const title = (meta?.title ?? "").trim() || `文档 #${node.targetId}`;
                                    const updateTime = formatDateTime(meta?.updateTime);

                                    return (
                                      <div
                                        key={node.nodeId}
                                        className="flex items-center justify-between gap-2 px-2 py-2 hover:bg-base-200"
                                      >
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-sm flex-1 min-w-0 justify-start"
                                          onClick={() => setOpenDocId(node.targetId)}
                                          title="打开文档"
                                        >
                                          <div className="min-w-0 text-left">
                                            <div className="truncate text-sm">{title}</div>
                                            {updateTime && (
                                              <div className="truncate text-xs opacity-60">
                                                更新于
                                                {" "}
                                                {updateTime}
                                              </div>
                                            )}
                                          </div>
                                        </button>

                                        <div className="dropdown dropdown-end">
                                          <button
                                            type="button"
                                            tabIndex={0}
                                            className="btn btn-ghost btn-xs"
                                            aria-label="文档操作"
                                          >
                                            <DotsThreeVerticalIcon className="size-4" />
                                          </button>
                                          <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-44">
                                            <li><a onClick={() => requestRenameDoc(node.targetId)}>重命名</a></li>
                                            <li><a onClick={() => requestDeleteDoc(node.targetId)}>删除</a></li>
                                          </ul>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

      <PopWindow isOpen={createFolderOpen} onClose={() => setCreateFolderOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">新建文件夹</div>
          <input
            className="input input-bordered w-full"
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateFolderOpen(false)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={() => void createFolder()}>创建</button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={createDocOpen} onClose={() => setCreateDocOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">新建文档</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs opacity-70 mb-1">标题</div>
              <input
                className="input input-bordered w-full"
                placeholder="新文档"
                value={newDocTitle}
                onChange={e => setNewDocTitle(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">放入文件夹</div>
              <select
                className="select select-bordered w-full"
                value={newDocCategoryId}
                onChange={e => setNewDocCategoryId(e.target.value)}
              >
                {tree.categories.map(c => (
                  <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateDocOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={createDocMutation.isPending}
              onClick={() => void createDoc()}
            >
              创建
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={renameDocOpen} onClose={() => setRenameDocOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">重命名文档</div>
          <input
            className="input input-bordered w-full"
            placeholder="文档标题"
            value={renameDocTitle}
            onChange={e => setRenameDocTitle(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setRenameDocOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={renameDocMutation.isPending}
              onClick={() => void submitRenameDoc()}
            >
              保存
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={renameCategoryOpen} onClose={() => setRenameCategoryOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">重命名文件夹</div>
          <input
            className="input input-bordered w-full"
            placeholder="文件夹名称"
            value={renameCategoryName}
            onChange={e => setRenameCategoryName(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setRenameCategoryOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={setTreeMutation.isPending}
              onClick={() => void submitRenameCategory()}
            >
              保存
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={deleteDocConfirmId != null} onClose={() => setDeleteDocConfirmId(null)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">删除文档</div>
          <div className="text-sm opacity-70">
            将删除：
            {" "}
            {deleteDocConfirmId != null ? (docById.get(deleteDocConfirmId)?.title ?? `文档 #${deleteDocConfirmId}`) : ""}
          </div>
          <div className="text-xs opacity-60 mt-2">提示：仅软删除，可用于恢复/审计。</div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteDocConfirmId(null)}>取消</button>
            <button
              type="button"
              className="btn btn-error"
              disabled={deleteDocMutation.isPending}
              onClick={() => void confirmDeleteDoc()}
            >
              删除
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow isOpen={deleteCategoryConfirmId != null} onClose={() => setDeleteCategoryConfirmId(null)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">删除文件夹</div>
          <div className="text-sm opacity-70">
            删除文件夹后，其中的文档将移动到第一个文件夹。
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteCategoryConfirmId(null)}>取消</button>
            <button
              type="button"
              className="btn btn-error"
              disabled={setTreeMutation.isPending}
              onClick={() => void confirmDeleteCategory()}
            >
              删除
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow
        isOpen={openDocId != null && openDocBlocksuiteId != null}
        onClose={() => setOpenDocId(null)}
      >
        <div className="w-[min(1200px,96vw)] h-[min(86vh,900px)] bg-base-100 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 border-b border-base-300 bg-base-100">
            <div className="text-sm opacity-80 truncate px-2">
              {openDocMeta?.title ?? `文档 #${openDocId ?? ""}`}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenDocId(null)}>关闭</button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-2">
            {openDocBlocksuiteId && (
              <div className="w-full h-full overflow-hidden bg-base-100 border border-base-300 rounded-box">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${spaceId}`}
                  spaceId={spaceId}
                  docId={openDocBlocksuiteId}
                  variant="full"
                  tcHeader={{ enabled: true, fallbackTitle: openDocMeta?.title ?? `文档 #${openDocId ?? ""}` }}
                  allowModeSwitch
                  fullscreenEdgeless
                  onTcHeaderChange={(payload: { header: BlocksuiteDocHeader }) => {
                    if (openDocId == null)
                      return;
                    const nextTitle = (payload.header?.title ?? "").trim();
                    if (!nextTitle)
                      return;
                    scheduleRenameFromEditor(openDocId, nextTitle);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
