import type { SpaceUserDocResponse } from "../../../../../api/models/SpaceUserDocResponse";
import type { FolderNode } from "./docFolderTagTree";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { DotsThreeVerticalIcon, FileTextIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateSpaceUserDocMutation,
  useDeleteSpaceUserDocMutation,
  useListSpaceUserDocsQuery,
  useRenameSpaceUserDocMutation,
  useUpdateSpaceUserDocTagMutation,
} from "api/hooks/spaceUserDocHooks";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildDescriptionDocId, parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { copyDocToSpaceUserDoc } from "@/components/chat/utils/docCopy";
import { getDocRefDragData, isDocRefDrag, setDocRefDragData } from "@/components/chat/utils/docRef";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { AddIcon, ChevronDown, FolderIcon } from "@/icons";
import { buildFolderNodes, normalizeTagPath, UNTAGGED_KEY } from "./docFolderTagTree";

const LOCAL_TAG_STORAGE_KEY = "tc:space-user-doc-local-tags";
const TAG_MAX_LENGTH = 64;

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
  const spaceId = spaceContext.spaceId ?? -1;
  const queryClient = useQueryClient();

  const docsQuery = useListSpaceUserDocsQuery(spaceId);
  const createDocMutation = useCreateSpaceUserDocMutation();
  const renameDocMutation = useRenameSpaceUserDocMutation();
  const deleteDocMutation = useDeleteSpaceUserDocMutation();
  const updateDocTagMutation = useUpdateSpaceUserDocTagMutation();

  const docs = useMemo(() => {
    if (!docsQuery.data?.success)
      return [] as SpaceUserDocResponse[];
    return Array.isArray(docsQuery.data?.data) ? docsQuery.data.data : [];
  }, [docsQuery.data]);

  const docById = useMemo(() => {
    const map = new Map<number, SpaceUserDocResponse>();
    for (const d of docs) {
      if (typeof d?.docId === "number")
        map.set(d.docId, d);
    }
    return map;
  }, [docs]);

  const [localTagStore, setLocalTagStore] = useLocalStorage<Record<string, string[]>>(LOCAL_TAG_STORAGE_KEY, {});
  const localTagSpaceKey = useMemo(() => (spaceId > 0 ? String(spaceId) : ""), [spaceId]);

  const localTags = useMemo(() => {
    if (!localTagSpaceKey)
      return [] as string[];
    const rawList = localTagStore[localTagSpaceKey];
    if (!Array.isArray(rawList))
      return [] as string[];
    const uniq = new Set<string>();
    for (const raw of rawList) {
      const normalized = normalizeTagPath(raw);
      if (normalized)
        uniq.add(normalized);
    }
    return [...uniq].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [localTagSpaceKey, localTagStore]);

  const rememberLocalTag = useCallback((tagPath: string) => {
    if (!localTagSpaceKey)
      return;
    const normalized = normalizeTagPath(tagPath);
    if (!normalized)
      return;
    setLocalTagStore((prev) => {
      const current = Array.isArray(prev[localTagSpaceKey]) ? prev[localTagSpaceKey] : [];
      if (current.includes(normalized))
        return prev;
      return {
        ...prev,
        [localTagSpaceKey]: [...current, normalized].sort((a, b) => a.localeCompare(b, "zh-CN")),
      };
    });
  }, [localTagSpaceKey, setLocalTagStore]);

  const folderNodes = useMemo(() => buildFolderNodes(docs, localTags), [docs, localTags]);

  const [collapsedTags, setCollapsedTags] = useState<Record<string, boolean>>({});
  const toggleTagCollapse = useCallback((tagKey: string) => {
    setCollapsedTags(prev => ({ ...prev, [tagKey]: !prev[tagKey] }));
  }, []);

  const [openDocId, setOpenDocId] = useState<number | null>(null);
  const openDocMeta = openDocId != null ? docById.get(openDocId) : null;
  const openDocBlocksuiteId = useMemo(() => {
    if (!openDocId)
      return null;
    return buildDescriptionDocId({ entityType: "space_user_doc", entityId: openDocId, docType: "description" });
  }, [openDocId]);
  const openDocTitle = useMemo(() => {
    if (!openDocId)
      return "";
    const title = (openDocMeta?.title ?? "").trim();
    return title || `文档 #${openDocId}`;
  }, [openDocId, openDocMeta?.title]);

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

  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createDocTitleDefaultValue, setCreateDocTitleDefaultValue] = useState("");
  const [createDocTagDefaultValue, setCreateDocTagDefaultValue] = useState("");
  const createDocTitleInputRef = useRef<HTMLInputElement | null>(null);
  const createDocTagInputRef = useRef<HTMLInputElement | null>(null);
  const [localTagCreateOpen, setLocalTagCreateOpen] = useState(false);
  const [localTagCreateDefaultValue, setLocalTagCreateDefaultValue] = useState("");
  const localTagCreateInputRef = useRef<HTMLInputElement | null>(null);

  const openLocalTagCreateDialog = useCallback((defaultTag: string = "") => {
    setLocalTagCreateDefaultValue(normalizeTagPath(defaultTag));
    setLocalTagCreateOpen(true);
  }, []);

  const openCreateDocDialog = useCallback((tagPath: string) => {
    setCreateDocTitleDefaultValue("");
    setCreateDocTagDefaultValue(normalizeTagPath(tagPath));
    setCreateDocOpen(true);
  }, []);

  useEffect(() => {
    if (!createDocOpen)
      return;
    const timer = window.setTimeout(() => {
      createDocTitleInputRef.current?.focus();
      createDocTitleInputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [createDocOpen, createDocTitleDefaultValue, createDocTagDefaultValue]);

  useEffect(() => {
    if (!localTagCreateOpen)
      return;
    const timer = window.setTimeout(() => {
      localTagCreateInputRef.current?.focus();
      localTagCreateInputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [localTagCreateOpen]);

  const submitCreateLocalTag = useCallback(() => {
    if (!spaceId || spaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    const normalized = normalizeTagPath(localTagCreateInputRef.current?.value ?? "");
    if (!normalized) {
      toast.error("请输入标签路径");
      return;
    }
    if (normalized.length > TAG_MAX_LENGTH) {
      toast.error(`标签长度不能超过 ${TAG_MAX_LENGTH}`);
      return;
    }
    rememberLocalTag(normalized);
    setLocalTagCreateOpen(false);
    toast.success("已创建本地文件夹");
  }, [rememberLocalTag, spaceId]);

  const submitCreateDoc = useCallback(async () => {
    if (!spaceId || spaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    const title = (createDocTitleInputRef.current?.value ?? "").trim();
    const tag = normalizeTagPath(createDocTagInputRef.current?.value ?? "");
    if (tag.length > TAG_MAX_LENGTH) {
      toast.error(`标签长度不能超过 ${TAG_MAX_LENGTH}`);
      return;
    }
    try {
      const res = await createDocMutation.mutateAsync({
        spaceId,
        ...(title ? { title } : {}),
        ...(tag ? { tag } : {}),
      });
      if (!res?.success) {
        toast.error(res?.errMsg ?? "创建文档失败");
        return;
      }
      const docId = res.data?.docId;
      if (typeof docId === "number" && Number.isFinite(docId)) {
        setOpenDocId(docId);
      }
      if (tag)
        rememberLocalTag(tag);
      setCreateDocTitleDefaultValue("");
      setCreateDocTagDefaultValue("");
      setCreateDocOpen(false);
    }
    catch (err) {
      console.error("[DocFolderForUser] createDoc failed", err);
      toast.error(err instanceof Error ? err.message : "创建文档失败");
    }
  }, [createDocMutation, rememberLocalTag, spaceId]);

  const [tagEditOpen, setTagEditOpen] = useState(false);
  const [tagEditDocId, setTagEditDocId] = useState<number | null>(null);
  const [tagEditDefaultValue, setTagEditDefaultValue] = useState("");
  const tagEditInputRef = useRef<HTMLInputElement | null>(null);

  const requestUpdateTag = useCallback((docId: number, currentTag: string | null | undefined) => {
    setTagEditDocId(docId);
    setTagEditDefaultValue(normalizeTagPath(currentTag));
    setTagEditOpen(true);
  }, []);

  useEffect(() => {
    if (!tagEditOpen)
      return;
    const timer = window.setTimeout(() => {
      tagEditInputRef.current?.focus();
      tagEditInputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [tagEditOpen, tagEditDocId]);

  const submitUpdateTag = useCallback(async () => {
    if (!spaceId || spaceId <= 0 || tagEditDocId == null) {
      toast.error("未选择空间");
      return;
    }
    const tag = normalizeTagPath(tagEditInputRef.current?.value ?? "");
    if (tag.length > TAG_MAX_LENGTH) {
      toast.error(`标签长度不能超过 ${TAG_MAX_LENGTH}`);
      return;
    }
    try {
      const res = await updateDocTagMutation.mutateAsync({
        spaceId,
        docId: tagEditDocId,
        ...(tag ? { tag } : {}),
      });
      if (!res?.success) {
        toast.error(res?.errMsg ?? "更新标签失败");
        return;
      }
      if (tag)
        rememberLocalTag(tag);
      setTagEditOpen(false);
    }
    catch (err) {
      console.error("[DocFolderForUser] update tag failed", err);
      toast.error(err instanceof Error ? err.message : "更新标签失败");
    }
  }, [rememberLocalTag, spaceId, tagEditDocId, updateDocTagMutation]);

  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<number | null>(null);

  const confirmDeleteDoc = useCallback(async () => {
    if (!spaceId || spaceId <= 0 || deleteDocConfirmId == null) {
      toast.error("未选择空间");
      return;
    }
    try {
      const res = await deleteDocMutation.mutateAsync({ spaceId, docId: deleteDocConfirmId });
      if (!res?.success) {
        toast.error(res?.errMsg ?? "删除失败");
        return;
      }
      if (openDocId === deleteDocConfirmId) {
        setOpenDocId(null);
      }
      setDeleteDocConfirmId(null);
    }
    catch (err) {
      console.error("[DocFolderForUser] delete failed", err);
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }, [deleteDocConfirmId, deleteDocMutation, openDocId, spaceId]);

  const [docCopyDropTagKey, setDocCopyDropTagKey] = useState<string | null>(null);
  const [docCopyPendingState, setDocCopyPendingState] = useState<{
    tagKey: string;
    mode: "copy" | "move";
  } | null>(null);
  const refreshUserDocList = useCallback(async () => {
    if (!spaceId || spaceId <= 0)
      return;
    await queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", spaceId] });
    await queryClient.refetchQueries({ queryKey: ["listSpaceUserDocs", spaceId], type: "active" });
  }, [queryClient, spaceId]);

  const handleDropDocRefToTag = useCallback(async (params: {
    tagKey: string;
    docRef: { docId: string; spaceId?: number; title?: string; imageUrl?: string };
  }) => {
    if (!spaceId || spaceId <= 0) {
      toast.error("未选择空间");
      return;
    }
    if (params.docRef.spaceId && params.docRef.spaceId !== spaceId) {
      toast.error("不允许跨空间复制文档");
      return;
    }

    try {
      const tag = params.tagKey === UNTAGGED_KEY ? "" : normalizeTagPath(params.tagKey);
      if (tag.length > TAG_MAX_LENGTH) {
        toast.error(`标签长度不能超过 ${TAG_MAX_LENGTH}`);
        return;
      }

      const parsed = parseDescriptionDocId(params.docRef.docId);
      const moveDocId = parsed?.entityType === "space_user_doc" && parsed.docType === "description"
        ? parsed.entityId
        : null;
      const moveTargetDoc = moveDocId != null ? docById.get(moveDocId) : undefined;
      const pendingMode: "copy" | "move" = moveDocId != null && moveTargetDoc ? "move" : "copy";
      setDocCopyPendingState({ tagKey: params.tagKey, mode: pendingMode });

      if (moveDocId != null && moveTargetDoc) {
        const currentTag = normalizeTagPath(moveTargetDoc.tag ?? "");
        if (currentTag === tag) {
          setDocCopyPendingState(null);
          toast("文档已在该文件夹");
          return;
        }
        const res = await updateDocTagMutation.mutateAsync({
          spaceId,
          docId: moveDocId,
          ...(tag ? { tag } : {}),
        });
        if (!res?.success) {
          toast.error(res?.errMsg ?? "移动文档失败");
          return;
        }
        if (tag)
          rememberLocalTag(tag);
        await refreshUserDocList();
        toast.success("已移动文档");
        return;
      }

      await copyDocToSpaceUserDoc({
        spaceId,
        sourceDocId: params.docRef.docId,
        title: params.docRef.title,
        imageUrl: params.docRef.imageUrl,
        ...(tag ? { tag } : {}),
      });
      if (tag)
        rememberLocalTag(tag);
      await refreshUserDocList();
      toast.success("已复制到我的文档");
    }
    catch (err) {
      console.error("[DocFolderForUser] drop doc failed", err);
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
    finally {
      setDocCopyPendingState(null);
    }
  }, [docById, refreshUserDocList, rememberLocalTag, spaceId, updateDocTagMutation]);

  const renderDocItem = (doc: SpaceUserDocResponse) => {
    const title = (doc.title ?? "").trim() || `文档 #${doc.docId}`;
    const updateTime = formatDateTime(doc.updateTime);
    const isActive = openDocId === doc.docId;
    const tooltip = updateTime ? `${title}（更新于 ${updateTime}）` : title;
    const dragDocId = buildDescriptionDocId({
      entityType: "space_user_doc",
      entityId: doc.docId ?? 0,
      docType: "description",
    });

    return (
      <div
        key={doc.docId}
        className={`group relative font-bold text-sm rounded-lg p-1 pr-10 flex justify-start items-center gap-2 w-full min-w-0 ${isActive ? "bg-info-content/10" : "hover:bg-base-300"}`}
        role="button"
        tabIndex={0}
        aria-pressed={isActive}
        title={tooltip}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "copyLink";
          setDocRefDragData(e.dataTransfer, {
            docId: dragDocId,
            ...(spaceId > 0 ? { spaceId } : {}),
            ...(title ? { title } : {}),
          });
        }}
        onClick={() => setOpenDocId(doc.docId ?? null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenDocId(doc.docId ?? null);
          }
        }}
      >
        <div className="mask mask-squircle size-8 bg-base-100 border border-base-300/60 flex items-center justify-center">
          <FileTextIcon className="size-4 opacity-70" />
        </div>
        <span className="flex-1 min-w-0 truncate text-left">
          {title}
        </span>

        <div
          className="absolute right-1 top-1/2 z-50 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
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
              <li>
                <a
                  onClick={() => {
                    if (typeof doc.docId !== "number")
                      return;
                    requestUpdateTag(doc.docId, doc.tag);
                  }}
                >
                  设置标签
                </a>
              </li>
              <li><a onClick={() => setDeleteDocConfirmId(doc.docId ?? null)}>删除</a></li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderFolderNode = (node: FolderNode) => {
    const isCollapsed = Boolean(collapsedTags[node.key]);
    const folderIndent = node.depth * 14;
    const itemIndent = (node.depth + 1) * 14;
    const isPending = docCopyPendingState?.tagKey === node.key;
    const pendingLabel = docCopyPendingState?.mode === "move" ? "移动中…" : "复制中…";

    return (
      <div
        key={node.key}
        data-tc-userdoc-tag={node.key}
        className={`px-1 rounded-lg ${docCopyDropTagKey === node.key ? "outline outline-2 outline-primary/50" : ""}`}
      >
        <div
          className={`flex items-center gap-1 py-1 pr-1 text-xs font-medium opacity-80 select-none rounded-lg hover:bg-base-300/40 ${isPending ? "bg-base-300/30" : ""}`}
          style={{ paddingLeft: `${folderIndent + 2}px` }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => void toggleTagCollapse(node.key)}
            title={isCollapsed ? "展开" : "折叠"}
          >
            <ChevronDown className={`size-4 opacity-80 ${isCollapsed ? "-rotate-90" : ""}`} />
          </button>

          <FolderIcon className="size-4 opacity-70" />
          <span className="flex-1 truncate">{node.label}</span>
          {isPending && (
            <span className="flex items-center gap-1 text-[11px] opacity-70">
              <span className="loading loading-spinner loading-xs"></span>
              {pendingLabel}
            </span>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title="在此文件夹创建文档…"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCreateDocDialog(node.tagPath);
            }}
          >
            <AddIcon />
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-1">
            {node.docs.length > 0 && (
              <div
                className="rounded-lg border border-base-300 px-1 py-1 space-y-1"
                style={{ marginLeft: `${itemIndent + 4}px` }}
              >
                {node.docs.map(doc => renderDocItem(doc))}
              </div>
            )}

            {node.children.map(child => renderFolderNode(child))}

            {node.docs.length === 0 && node.children.length === 0 && (
              <div className="px-2 py-2 text-xs opacity-60" style={{ marginLeft: `${itemIndent + 4}px` }}>
                空文件夹
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2 border-b border-base-300">
        <div className="text-sm font-medium opacity-80">我的文档</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title="新建本地文件夹"
            onClick={() => openLocalTagCreateDialog("")}
          >
            <FolderIcon className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title="新建文档"
            onClick={() => openCreateDocDialog("")}
          >
            <AddIcon />
          </button>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-auto"
        onDragOverCapture={(e) => {
          if (!spaceId || spaceId <= 0)
            return;
          if (!isDocRefDrag(e.dataTransfer))
            return;
          e.preventDefault();
          if (docCopyPendingState) {
            e.dataTransfer.dropEffect = "none";
            return;
          }
          const dragPayload = getDocRefDragData(e.dataTransfer);
          const parsed = dragPayload ? parseDescriptionDocId(dragPayload.docId) : null;
          const isMoveInPlace = parsed?.entityType === "space_user_doc"
            && parsed.docType === "description"
            && docById.has(parsed.entityId);
          e.dataTransfer.dropEffect = isMoveInPlace ? "move" : "copy";

          const targetEl = e.target as HTMLElement | null;
          const tagEl = targetEl?.closest?.("[data-tc-userdoc-tag]") as HTMLElement | null;
          const tagKey = tagEl?.getAttribute?.("data-tc-userdoc-tag") || "";
          const nextDropKey = tagKey || null;
          if (nextDropKey !== docCopyDropTagKey)
            setDocCopyDropTagKey(nextDropKey);
        }}
        onDropCapture={(e) => {
          if (!spaceId || spaceId <= 0)
            return;
          if (!isDocRefDrag(e.dataTransfer))
            return;
          if (docCopyPendingState) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          const docRef = getDocRefDragData(e.dataTransfer);
          if (!docRef) {
            toast.error("未识别到文档拖拽数据，请从文档卡片空白处重新拖拽");
            return;
          }

          const targetEl = e.target as HTMLElement | null;
          const tagEl = targetEl?.closest?.("[data-tc-userdoc-tag]") as HTMLElement | null;
          const tagKey = tagEl?.getAttribute?.("data-tc-userdoc-tag") || UNTAGGED_KEY;
          setDocCopyDropTagKey(null);
          void handleDropDocRefToTag({ tagKey, docRef });
        }}
      >
        <div className="p-2 space-y-2 min-h-full">
          {folderNodes.length === 0 && (
            <div className="px-3 py-2 text-xs opacity-60">暂无文档</div>
          )}
          {folderNodes.map(node => renderFolderNode(node))}
        </div>
      </div>

      <ToastWindow isOpen={localTagCreateOpen} onClose={() => setLocalTagCreateOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">新建本地文件夹</div>
          <input
            key={`local-tag:${localTagCreateOpen ? "open" : "closed"}:${localTagCreateDefaultValue}`}
            ref={localTagCreateInputRef}
            className="input input-bordered w-full"
            placeholder="例如：资料/设定/角色"
            defaultValue={localTagCreateDefaultValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCreateLocalTag();
              }
            }}
          />
          <div className="text-xs opacity-60 mt-2">仅前端本地保存，拖拽文档到此文件夹时才会写入后端 tag。</div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setLocalTagCreateOpen(false)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={() => submitCreateLocalTag()}>创建</button>
          </div>
        </div>
      </ToastWindow>

      <ToastWindow isOpen={createDocOpen} onClose={() => setCreateDocOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">新建文档</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs opacity-70 mb-1">标题</div>
              <input
                key={`create-doc-title:${createDocOpen ? "open" : "closed"}:${createDocTitleDefaultValue}`}
                ref={createDocTitleInputRef}
                className="input input-bordered w-full"
                placeholder="新文档"
                defaultValue={createDocTitleDefaultValue}
              />
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">标签（可选）</div>
              <input
                key={`create-doc-tag:${createDocOpen ? "open" : "closed"}:${createDocTagDefaultValue}`}
                ref={createDocTagInputRef}
                className="input input-bordered w-full"
                placeholder="例如：资料/设定/灵感"
                defaultValue={createDocTagDefaultValue}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateDocOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={createDocMutation.isPending}
              onClick={() => void submitCreateDoc()}
            >
              创建
            </button>
          </div>
        </div>
      </ToastWindow>

      <ToastWindow isOpen={tagEditOpen} onClose={() => setTagEditOpen(false)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">设置标签</div>
          <input
            key={`${tagEditDocId ?? "none"}:${tagEditOpen ? "open" : "closed"}`}
            ref={tagEditInputRef}
            className="input input-bordered w-full"
            placeholder="留空表示清除标签，支持 / 分层"
            defaultValue={tagEditDefaultValue}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-ghost" onClick={() => setTagEditOpen(false)}>取消</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={updateDocTagMutation.isPending}
              onClick={() => void submitUpdateTag()}
            >
              保存
            </button>
          </div>
        </div>
      </ToastWindow>

      <ToastWindow isOpen={deleteDocConfirmId != null} onClose={() => setDeleteDocConfirmId(null)}>
        <div className="w-[min(520px,92vw)] p-6">
          <div className="text-sm font-medium opacity-80 mb-3">删除文档</div>
          <div className="text-sm opacity-70">
            将删除：
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
      </ToastWindow>

      <ToastWindow
        isOpen={openDocId != null && openDocBlocksuiteId != null}
        onClose={() => setOpenDocId(null)}
      >
        <div className="w-[min(1200px,96vw)] h-[min(86vh,900px)] bg-base-100 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 border-b border-base-300 bg-base-100">
            <div className="text-sm opacity-80 truncate px-2">
              {openDocTitle}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpenDocId(null)}
              >
                关闭
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-2">
            {openDocBlocksuiteId && (
              <div className="w-full h-full overflow-hidden bg-base-100 border border-base-300 rounded-box">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${spaceId}`}
                  spaceId={spaceId}
                  docId={openDocBlocksuiteId}
                  variant="full"
                  readOnly={false}
                  tcHeader={{ enabled: true, fallbackTitle: openDocTitle }}
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
      </ToastWindow>
    </div>
  );
}
