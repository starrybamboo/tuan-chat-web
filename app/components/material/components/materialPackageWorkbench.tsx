import type { MaterialNode } from "@tuanchat/openapi-client/models/MaterialNode";
import type { DragEvent } from "react";
import type { UserRole } from "../../../../api";
import type { MaterialMessageComposerHandle } from "./materialMessageComposer";
import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import type { MaterialEditorActionScope } from "@/components/chat/chatPage.types";
import type { MaterialItemDragPayload } from "@/components/chat/utils/materialItemDrag";
import type { MessageDraft } from "@/types/messageDraft";
import {
  CaretRightIcon,
  FileIcon,
  FolderSimpleIcon,
  ImageIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { MaterialNode as MaterialNodeModel } from "@tuanchat/openapi-client/models/MaterialNode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { setMaterialItemDragData } from "@/components/chat/utils/materialItemDrag";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { useMaterialEditorActionStore } from "@/components/material/stores/materialEditorActionStore";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { MaterialComposerProvider } from "./materialComposerContext";
import MaterialMessageComposer from "./materialMessageComposer";
import MaterialMessageEditorCard from "./materialMessageEditorCard";
import {
  appendNodeToContent,
  collectFolderKeys,
  countFolderNodes,
  countMaterialAssets,
  countMaterialNodes,
  createFolderNode,
  createMaterialNode,
  getNodeAtPath,
  getNodeLabel,
  isAncestorPath,
  moveNodeInContent,
  parseNodePath,
  removeNodeFromContent,
  ROOT_NODE_KEY,
  serializeNodePath,
  updateNodeInContent,
} from "./materialPackageTreeUtils";

interface MaterialPackageWorkbenchProps {
  selectionSyncKey: string;
  dragPackageId?: number;
  requestedSelectedNodeKey?: string | null;
  sidebarActionScope?: MaterialEditorActionScope;
  showStructureSidebar: boolean;
  draft: MaterialPackageDraft;
  readOnly: boolean;
  showPublicToggle: boolean;
  isCoverUploading: boolean;
  deleteLabel?: string;
  deletePending?: boolean;
  onDelete?: () => Promise<void> | void;
  onUpdateDraft: (updater: (draft: MaterialPackageDraft) => MaterialPackageDraft) => void;
  onCoverUpload: (file: File) => void;
}

function resolveDefaultAvatarId(
  roles: UserRole[],
  avatarIdMap: Record<number, number>,
  roleId: number,
): number | undefined {
  if (roleId <= 0) {
    return undefined;
  }
  const storedAvatarId = avatarIdMap[roleId];
  if (typeof storedAvatarId === "number" && storedAvatarId > 0) {
    return storedAvatarId;
  }
  const role = roles.find(item => item.roleId === roleId);
  return typeof role?.avatarId === "number" && role.avatarId > 0 ? role.avatarId : undefined;
}

function getMessageDraftKey(messages: MessageDraft[], index: number, nodeKey: string): string {
  const serializeDraft = (message: MessageDraft) => JSON.stringify({
    annotations: message.annotations ?? [],
    avatarId: message.avatarId ?? null,
    content: message.content ?? "",
    customRoleName: message.customRoleName ?? "",
    extra: message.extra ?? {},
    messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
    roleId: message.roleId ?? null,
    webgal: message.webgal ?? {},
  });

  const currentMessage = messages[index];
  const signature = serializeDraft(currentMessage);
  let occurrence = 0;

  for (let cursor = 0; cursor <= index; cursor += 1) {
    if (serializeDraft(messages[cursor]) === signature) {
      occurrence += 1;
    }
  }

  return `${nodeKey}:${signature}:${occurrence}`;
}

function getReadOnlyAssetTypeLabel(message: MessageDraft) {
  switch (message.messageType) {
    case MESSAGE_TYPE.TEXT:
      return "文本";
    case MESSAGE_TYPE.INTRO_TEXT:
      return "黑屏文字";
    case MESSAGE_TYPE.IMG:
      return "图片";
    case MESSAGE_TYPE.FILE:
      return "文件";
    case MESSAGE_TYPE.SYSTEM:
      return "系统";
    case MESSAGE_TYPE.FORWARD:
      return "转发";
    case MESSAGE_TYPE.DICE:
      return "骰娘";
    case MESSAGE_TYPE.SOUND:
      return "音频";
    case MESSAGE_TYPE.EFFECT:
      return "特效";
    case MESSAGE_TYPE.WEBGAL_CHOOSE:
      return "选择";
    case MESSAGE_TYPE.VIDEO:
      return "视频";
    case MESSAGE_TYPE.CLUE_CARD:
      return "线索";
    case MESSAGE_TYPE.DOC_CARD:
      return "文档";
    case MESSAGE_TYPE.ROOM_JUMP:
      return "群聊";
    case MESSAGE_TYPE.THREAD_ROOT:
      return "子区";
    default:
      return "素材";
  }
}

function ReadOnlyAssetCard({ message, index }: { message: MessageDraft; index: number }) {
  const annotationText = Array.isArray(message.annotations) && message.annotations.length > 0
    ? message.annotations.join(" / ")
    : "";

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          {getReadOnlyAssetTypeLabel(message)}
        </span>
        {annotationText && (
          <div className="text-xs text-base-content/45">
            {annotationText}
          </div>
        )}
      </div>
      <div className="mt-3 text-sm text-base-content">
        {/*
          公开素材包也复用统一消息渲染，避免媒体条目退化为仅显示文件名。
        */}
        <MessageContentRenderer
          message={{
            ...message,
            content: message.content ?? "",
            messageId: index + 1,
            messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
            roomId: undefined,
            status: 0,
          }}
          annotations={message.annotations}
          cacheKeyBase={`material-readonly:${index}`}
        />
      </div>
    </div>
  );
}

function canDragMessageToRoom(message: MessageDraft) {
  return Boolean(message);
}

export default function MaterialPackageWorkbench({
  selectionSyncKey,
  dragPackageId,
  requestedSelectedNodeKey,
  sidebarActionScope,
  showStructureSidebar,
  draft,
  readOnly,
  showPublicToggle,
  isCoverUploading,
  deleteLabel = "删除",
  deletePending = false,
  onDelete,
  onUpdateDraft,
  onCoverUpload,
}: MaterialPackageWorkbenchProps) {
  const userId = useGlobalUserId();
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const availableRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  const curAvatarIdMap = useRoomRoleSelectionStore(state => state.curAvatarIdMap);
  const [selectedNodeKey, setSelectedNodeKey] = useState(ROOT_NODE_KEY);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [hasInitializedTree, setHasInitializedTree] = useState(false);
  const [draggedNodeKey, setDraggedNodeKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");
  const composerContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<MaterialMessageComposerHandle | null>(null);
  const setMaterialEditorController = useMaterialEditorActionStore(state => state.setController);
  const clearMaterialEditorController = useMaterialEditorActionStore(state => state.clearController);

  const rootNodes = useMemo(() => draft.content.root ?? [], [draft.content.root]);
  const folderCount = useMemo(() => countFolderNodes(rootNodes), [rootNodes]);
  const materialCount = useMemo(() => countMaterialNodes(rootNodes), [rootNodes]);
  const assetCount = useMemo(() => countMaterialAssets(rootNodes), [rootNodes]);
  const selectedNodePath = useMemo(() => parseNodePath(selectedNodeKey), [selectedNodeKey]);
  const selectedNode = useMemo(
    () => (selectedNodeKey === ROOT_NODE_KEY ? null : getNodeAtPath(rootNodes, selectedNodePath)),
    [rootNodes, selectedNodeKey, selectedNodePath],
  );
  const selectedIsFolder = !selectedNode || selectedNode.type === MaterialNodeModel.type.FOLDER;
  const firstAvailableRoleId = availableRoles[0]?.roleId;
  const fallbackRoleId = useMemo(() => firstAvailableRoleId ?? 0, [firstAvailableRoleId]);
  const fallbackAvatarId = useMemo(() => {
    if (fallbackRoleId <= 0) {
      return -1;
    }
    return resolveDefaultAvatarId(availableRoles, curAvatarIdMap, fallbackRoleId) ?? -1;
  }, [availableRoles, curAvatarIdMap, fallbackRoleId]);
  const fieldClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-2.5 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";
  const textareaClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-3 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

  useEffect(() => {
    const folderKeys = collectFolderKeys(rootNodes);
    if (!hasInitializedTree) {
      queueMicrotask(() => setExpandedKeys(folderKeys));
      queueMicrotask(() => setHasInitializedTree(true));
      return;
    }

    const validKeys = new Set(folderKeys);
    queueMicrotask(() => setExpandedKeys(previous => previous.filter(key => validKeys.has(key))));
  }, [hasInitializedTree, rootNodes]);

  useEffect(() => {
    if (selectedNodeKey === ROOT_NODE_KEY) {
      return;
    }

    if (!selectedNode) {
      queueMicrotask(() => setSelectedNodeKey(ROOT_NODE_KEY));
    }
  }, [selectedNode, selectedNodeKey]);

  useEffect(() => {
    const candidate = (requestedSelectedNodeKey ?? "").trim();
    const candidatePath = parseNodePath(candidate);
    const nextSelectedNodeKey = candidatePath.length > 0 ? serializeNodePath(candidatePath) : ROOT_NODE_KEY;

    queueMicrotask(() => setSelectedNodeKey(nextSelectedNodeKey));

    if (nextSelectedNodeKey === ROOT_NODE_KEY) {
      return;
    }

    const nextPath = parseNodePath(nextSelectedNodeKey);
    const ancestorKeys = nextPath.slice(0, -1).map((_, index) => serializeNodePath(nextPath.slice(0, index + 1)));
    queueMicrotask(() => setExpandedKeys(previous => Array.from(new Set([...previous, ...ancestorKeys]))));
  }, [requestedSelectedNodeKey, selectionSyncKey]);

  const toggleFolder = (nodeKey: string) => {
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      }
      else {
        next.add(nodeKey);
      }
      return [...next];
    });
  };

  const selectNode = (nodeKey: string) => {
    setSelectedNodeKey(nodeKey);
  };

  const finishNodeMove = (sourceKey: string, targetKey: string, mode: "inside" | "after") => {
    if (readOnly) {
      return;
    }
    const sourcePath = parseNodePath(sourceKey);
    const targetPath = parseNodePath(targetKey);
    const moveResult = moveNodeInContent(draft.content, sourcePath, targetPath, mode);

    if (!moveResult.movedPath) {
      setDraggedNodeKey("");
      setDropTargetKey("");
      return;
    }

    onUpdateDraft(current => ({
      ...current,
      content: moveResult.content,
    }));

    const movedPathKey = serializeNodePath(moveResult.movedPath);
    setSelectedNodeKey(movedPathKey);

    const expandCandidates = moveResult.movedPath.slice(0, -1).map((_, index) => serializeNodePath(moveResult.movedPath!.slice(0, index + 1)));
    setExpandedKeys(previous => Array.from(new Set([...previous, ...expandCandidates])));
    setDraggedNodeKey("");
    setDropTargetKey("");
  };

  const appendNode = useCallback((parentPath: number[], node: MaterialNode) => {
    if (readOnly) {
      return;
    }
    const nextKey = serializeNodePath([...parentPath, parentPath.length === 0
      ? rootNodes.length
      : (getNodeAtPath(rootNodes, parentPath)?.children?.length ?? 0)]);

    onUpdateDraft(current => ({
      ...current,
      content: appendNodeToContent(current.content, parentPath, node),
    }));

    if (parentPath.length > 0) {
      const parentKey = serializeNodePath(parentPath);
      setExpandedKeys(previous => Array.from(new Set([...previous, parentKey])));
    }
    setSelectedNodeKey(nextKey);
  }, [onUpdateDraft, readOnly, rootNodes]);

  const handleAddFolder = useCallback(() => {
    appendNode(selectedIsFolder ? selectedNodePath : [], createFolderNode());
  }, [appendNode, selectedIsFolder, selectedNodePath]);

  const handleAddMaterial = useCallback(() => {
    appendNode(selectedIsFolder ? selectedNodePath : [], createMaterialNode());
  }, [appendNode, selectedIsFolder, selectedNodePath]);

  const handleDeleteSelectedNode = useCallback(() => {
    if (readOnly || selectedNodeKey === ROOT_NODE_KEY) {
      return;
    }

    const parentPath = selectedNodePath.slice(0, -1);
    onUpdateDraft(current => ({
      ...current,
      content: removeNodeFromContent(current.content, selectedNodePath),
    }));
    setSelectedNodeKey(parentPath.length > 0 ? serializeNodePath(parentPath) : ROOT_NODE_KEY);
  }, [onUpdateDraft, readOnly, selectedNodeKey, selectedNodePath]);

  const handleAddFolderAtNodeKey = useCallback((parentNodeKey?: string | null) => {
    const normalizedParentKey = serializeNodePath(parseNodePath(parentNodeKey ?? ROOT_NODE_KEY));
    const parentPath = parseNodePath(normalizedParentKey || ROOT_NODE_KEY);
    const parentNode = parentPath.length > 0 ? getNodeAtPath(rootNodes, parentPath) : null;
    if (parentPath.length > 0 && parentNode?.type !== MaterialNodeModel.type.FOLDER) {
      return;
    }
    appendNode(parentPath, createFolderNode());
  }, [appendNode, rootNodes]);

  const handleAddMaterialAtNodeKey = useCallback((parentNodeKey?: string | null) => {
    const normalizedParentKey = serializeNodePath(parseNodePath(parentNodeKey ?? ROOT_NODE_KEY));
    const parentPath = parseNodePath(normalizedParentKey || ROOT_NODE_KEY);
    const parentNode = parentPath.length > 0 ? getNodeAtPath(rootNodes, parentPath) : null;
    if (parentPath.length > 0 && parentNode?.type !== MaterialNodeModel.type.FOLDER) {
      return;
    }
    appendNode(parentPath, createMaterialNode());
  }, [appendNode, rootNodes]);

  const handleDeleteNodeByKey = useCallback((nodeKey: string) => {
    const normalizedNodeKey = serializeNodePath(parseNodePath(nodeKey));
    if (!normalizedNodeKey) {
      return;
    }
    const nodePath = parseNodePath(normalizedNodeKey);
    if (nodePath.length === 0) {
      return;
    }
    const parentPath = nodePath.slice(0, -1);
    onUpdateDraft(current => ({
      ...current,
      content: removeNodeFromContent(current.content, nodePath),
    }));
    setSelectedNodeKey(parentPath.length > 0 ? serializeNodePath(parentPath) : ROOT_NODE_KEY);
  }, [onUpdateDraft]);

  useEffect(() => {
    if (!sidebarActionScope) {
      return;
    }

    if (readOnly || !dragPackageId || !Number.isFinite(dragPackageId) || dragPackageId <= 0) {
      clearMaterialEditorController(sidebarActionScope);
      return;
    }

    setMaterialEditorController(sidebarActionScope, {
      packageId: dragPackageId,
      addFolder: handleAddFolderAtNodeKey,
      addMaterial: handleAddMaterialAtNodeKey,
      deleteNode: handleDeleteNodeByKey,
    });

    return () => {
      clearMaterialEditorController(sidebarActionScope);
    };
  }, [
    clearMaterialEditorController,
    dragPackageId,
    handleAddFolderAtNodeKey,
    handleAddMaterialAtNodeKey,
    handleDeleteNodeByKey,
    readOnly,
    setMaterialEditorController,
    sidebarActionScope,
  ]);

  const updateSelectedMaterialMessages = (
    updater: (messages: MessageDraft[]) => MessageDraft[],
  ) => {
    if (readOnly || !selectedNode || selectedNode.type !== MaterialNodeModel.type.MATERIAL) {
      return;
    }

    onUpdateDraft(current => ({
      ...current,
      content: updateNodeInContent(current.content, selectedNodePath, (node) => {
        if (node.type !== MaterialNodeModel.type.MATERIAL) {
          return node;
        }
        return {
          ...node,
          messages: updater(node.messages ?? []),
        };
      }),
    }));
  };

  const updateSelectedMaterialMessage = (
    messageIndex: number,
    updater: (message: MessageDraft) => MessageDraft,
  ) => {
    updateSelectedMaterialMessages(messages =>
      messages.map((message, index) => (index === messageIndex ? updater(message) : message)),
    );
  };

  const removeSelectedMaterialMessage = (messageIndex: number) => {
    updateSelectedMaterialMessages(messages => messages.filter((_, index) => index !== messageIndex));
  };

  const buildAssetDragPayload = (message: MessageDraft, assetIndex: number): MaterialItemDragPayload | null => {
    if (!selectedNode || selectedNode.type !== MaterialNodeModel.type.MATERIAL) {
      return null;
    }

    return {
      itemKind: "asset",
      spacePackageId: dragPackageId ?? 0,
      packageName: draft.name.trim() || undefined,
      materialPathKey: selectedNodePath.join("."),
      materialName: getNodeLabel(selectedNode, "未命名素材"),
      messageCount: 1,
      assetIndex,
      messages: [JSON.parse(JSON.stringify(message))],
    };
  };

  const renderTree = (nodes: MaterialNode[], parentPath: number[] = [], depth = 0) => {
    return nodes.map((node, index) => {
      const path = [...parentPath, index];
      const nodeKey = serializeNodePath(path);
      const isFolder = node.type === MaterialNodeModel.type.FOLDER;
      const isExpanded = expandedKeys.includes(nodeKey);
      const isSelected = nodeKey === selectedNodeKey;
      const isDropTarget = nodeKey === dropTargetKey;
      const isInvalidDrop = Boolean(draggedNodeKey)
        && (draggedNodeKey === nodeKey || isAncestorPath(parseNodePath(draggedNodeKey), path));
      const canExpand = isFolder && (node.children?.length ?? 0) > 0;
      const rowStyle = { paddingLeft: 8 + depth * 14 };

      return (
        <div key={nodeKey} className="space-y-1">
          <div
            className={`flex items-start gap-1.5 rounded-md px-1.5 py-1.5 text-sm transition ${
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-base-content/72 hover:bg-base-200 hover:text-base-content"
            } ${isDropTarget ? "ring-2 ring-primary/20" : ""}`}
            style={rowStyle}
            onDragOver={(event) => {
              if (readOnly || !draggedNodeKey || isInvalidDrop) {
                return;
              }
              event.preventDefault();
              setDropTargetKey(nodeKey);
            }}
            onDragLeave={() => {
              if (dropTargetKey === nodeKey) {
                setDropTargetKey("");
              }
            }}
            onDrop={(event) => {
              if (readOnly || !draggedNodeKey || isInvalidDrop) {
                return;
              }
              event.preventDefault();
              finishNodeMove(draggedNodeKey, nodeKey, isFolder ? "inside" : "after");
            }}
          >
            <button
              type="button"
              className={`mt-0.5 inline-flex size-4 items-center justify-center ${canExpand ? "" : "opacity-0 pointer-events-none"}`}
              onClick={() => {
                if (canExpand) {
                  toggleFolder(nodeKey);
                }
              }}
            >
              <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
            </button>

            <button
              type="button"
              className={`flex min-w-0 flex-1 items-start gap-2 text-left ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
              onClick={() => selectNode(nodeKey)}
              draggable={!readOnly}
              onDragStart={(event) => {
                if (readOnly) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", nodeKey);
                setDraggedNodeKey(nodeKey);
              }}
              onDragEnd={() => {
                setDraggedNodeKey("");
                setDropTargetKey("");
              }}
            >
              {isFolder
                ? <FolderSimpleIcon className="mt-0.5 size-4 shrink-0" weight={isSelected ? "fill" : "regular"} />
                : <FileIcon className="mt-0.5 size-4 shrink-0" weight={isSelected ? "fill" : "regular"} />}
              <div className="min-w-0 flex-1">
                <div className="truncate">{getNodeLabel(node, isFolder ? "未命名文件夹" : "未命名素材")}</div>
                {!isFolder && (
                  <div className="truncate text-[11px] text-base-content/45">
                    {`${node.messages?.length ?? 0} 条素材条目`}
                  </div>
                )}
              </div>
            </button>
          </div>

          {canExpand && isExpanded && node.children && node.children.length > 0 && (
            <div className="space-y-1">
              {renderTree(node.children, path, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={showStructureSidebar
      ? "grid min-w-0 overflow-hidden lg:min-h-[680px] lg:grid-cols-[320px_minmax(0,1fr)]"
      : "flex min-h-0 min-w-0 overflow-hidden lg:min-h-[680px]"}
    >
      {showStructureSidebar && (
        <aside className="border-b border-base-300 bg-base-200/45 lg:min-h-0 lg:border-r lg:border-b-0">
          <div className="border-b border-base-300 px-3 py-3">
            <div className="flex items-center justify-between rounded-md bg-base-300/55 px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-base-content/86">
              <span className="truncate">素材结构</span>
              {!readOnly && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88"
                    title="新增文件夹"
                    onClick={handleAddFolder}
                  >
                    <FolderSimpleIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88"
                    title="新增素材"
                    onClick={handleAddMaterial}
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[40vh] min-h-56 overflow-y-auto px-2 py-2 lg:h-[calc(100%-4.75rem)] lg:max-h-none">
            <div className="space-y-1">
              <button
                type="button"
                className={`group relative flex w-full min-w-0 select-none items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${
                  selectedNodeKey === ROOT_NODE_KEY
                    ? "bg-primary/10 text-primary"
                    : "text-base-content/78 hover:bg-base-300 hover:text-base-content"
                } ${dropTargetKey === ROOT_NODE_KEY ? "ring-2 ring-primary/20" : ""}`}
                onClick={() => setSelectedNodeKey(ROOT_NODE_KEY)}
                onDragOver={(event) => {
                  if (readOnly || !draggedNodeKey) {
                    return;
                  }
                  event.preventDefault();
                  setDropTargetKey(ROOT_NODE_KEY);
                }}
                onDragLeave={() => {
                  if (dropTargetKey === ROOT_NODE_KEY) {
                    setDropTargetKey("");
                  }
                }}
                onDrop={(event) => {
                  if (readOnly || !draggedNodeKey) {
                    return;
                  }
                  event.preventDefault();
                  const sourcePath = parseNodePath(draggedNodeKey);
                  if (sourcePath.length === 0) {
                    return;
                  }
                  const nextContent = removeNodeFromContent(draft.content, sourcePath);
                  const sourceNode = getNodeAtPath(rootNodes, sourcePath);
                  if (!sourceNode) {
                    setDraggedNodeKey("");
                    setDropTargetKey("");
                    return;
                  }
                  const movedContent = appendNodeToContent(nextContent, [], sourceNode);
                  const movedPath = [movedContent.root?.length ? movedContent.root.length - 1 : 0];
                  onUpdateDraft(current => ({
                    ...current,
                    content: movedContent,
                  }));
                  setSelectedNodeKey(serializeNodePath(movedPath));
                  setDraggedNodeKey("");
                  setDropTargetKey("");
                }}
              >
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-base-300/60 bg-base-100">
                  {draft.coverUrl
                    ? (
                        <img
                          src={draft.coverUrl}
                          alt={draft.name || "素材包封面"}
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                      )
                    : (
                        <PackageIcon className="size-4 opacity-70" weight="duotone" />
                      )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{draft.name.trim() || "未命名素材包"}</div>
                  <div className="truncate text-[11px] text-base-content/45">
                    {`${folderCount} 个文件夹 · ${materialCount} 个素材 · ${assetCount} 条素材条目`}
                  </div>
                </div>
              </button>

              <div className="space-y-1 py-1">
                {renderTree(rootNodes)}
              </div>
            </div>
          </div>
        </aside>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto bg-base-100/65 p-4 sm:p-5 lg:p-6">
        {selectedNodeKey === ROOT_NODE_KEY && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${folderCount} 个文件夹`}</span>
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${materialCount} 个素材`}</span>
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${assetCount} 个素材条目`}</span>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <label className="block space-y-2">
                  <span className="flex items-center justify-between text-sm font-medium text-base-content/80">
                    <span>素材包名称</span>
                    {!draft.name.trim() && !readOnly && <span className="text-xs text-error/80">必填</span>}
                  </span>
                  <input
                    type="text"
                    placeholder="给你的素材包起个响亮的名字..."
                    className={fieldClassName}
                    value={draft.name}
                    onChange={event => onUpdateDraft(current => ({ ...current, name: event.target.value }))}
                    disabled={readOnly}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-base-content/80">发布描述</span>
                  <textarea
                    placeholder="简单描述一下这个素材包的风格和用途吧（可选），这能帮助其他创作者更好地了解你的素材。"
                    className={`${textareaClassName} min-h-32 resize-y`}
                    value={draft.description}
                    onChange={event => onUpdateDraft(current => ({ ...current, description: event.target.value }))}
                    disabled={readOnly}
                  />
                </label>

                {showPublicToggle && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-base-content/90">公开至素材广场</div>
                      <div className="text-sm text-base-content/60">允许其他创作者浏览并下载此素材包。</div>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                        draft.isPublic
                          ? "border-primary/40 bg-primary/90"
                          : "border-base-300 bg-base-100"
                      } ${readOnly ? "cursor-not-allowed opacity-60" : "hover:border-primary/40"}`}
                      aria-pressed={draft.isPublic}
                      onClick={() => {
                        if (!readOnly) {
                          onUpdateDraft(current => ({ ...current, isPublic: !current.isPublic }));
                        }
                      }}
                      disabled={readOnly}
                    >
                      <span
                        className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                          draft.isPublic ? "translate-x-[1.45rem]" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {!readOnly && onDelete && (
                  <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-error">危险操作</div>
                        <div className="text-sm text-base-content/60">
                          删除后会移除整个素材包及其内部全部文件夹、素材和素材条目。
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-error/30 bg-base-100 px-4 py-2.5 text-sm font-medium text-error transition hover:bg-error/10 disabled:opacity-60 sm:w-auto"
                        onClick={() => void onDelete()}
                        disabled={deletePending}
                      >
                        <TrashIcon className="size-4" />
                        <span>{deletePending ? "删除中..." : deleteLabel}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col rounded-[26px] border border-base-300 bg-base-200/55 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-base-content/75">封面图片</span>
                  {!readOnly && <span className="text-[11px] text-base-content/40">推荐尺寸 1:1，支持 JPG/PNG，小于 2MB</span>}
                </div>
                <div className="flex flex-1 flex-col justify-center overflow-hidden rounded-[22px] border border-base-300 bg-base-950/90 shadow-inner">
                  {draft.coverUrl
                    ? (
                        <img
                          src={draft.coverUrl}
                          alt={draft.name || "素材包封面"}
                          className="aspect-square w-full object-cover"
                        />
                      )
                    : (
                        <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))] text-base-content/40">
                          <PackageIcon className="size-16 opacity-50" weight="duotone" />
                        </div>
                      )}
                </div>

                {!readOnly && (
                  <div className="mt-4">
                    <ImgUploader setImg={file => onCoverUpload(file)}>
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                        disabled={isCoverUploading}
                      >
                        <ImageIcon className="size-4" />
                        <span>{isCoverUploading ? "上传中..." : "上传封面"}</span>
                      </button>
                    </ImgUploader>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedNode && selectedNode.type === MaterialNodeModel.type.FOLDER && (
          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-base-content/80">文件夹名称</span>
              <input
                type="text"
                className={fieldClassName}
                value={selectedNode.name ?? ""}
                disabled={readOnly}
                onChange={(event) => {
                  const nextName = event.target.value;
                  onUpdateDraft(current => ({
                    ...current,
                    content: updateNodeInContent(current.content, selectedNodePath, node => ({ ...node, name: nextName })),
                  }));
                }}
              />
            </label>

            {!readOnly && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90 sm:w-auto"
                  onClick={handleAddFolder}
                >
                  <FolderSimpleIcon className="size-4" />
                  <span>新建子文件夹</span>
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90 sm:w-auto"
                  onClick={handleAddMaterial}
                >
                  <PlusIcon className="size-4" />
                  <span>新建素材</span>
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error sm:w-auto"
                  onClick={handleDeleteSelectedNode}
                >
                  <TrashIcon className="size-4" />
                  <span>删除文件夹</span>
                </button>
              </div>
            )}
          </div>
        )}

        {selectedNode && selectedNode.type === MaterialNodeModel.type.MATERIAL && (
          <MaterialComposerProvider composerKey={selectedNodeKey}>
            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">素材名称</span>
                <input
                  type="text"
                  className={fieldClassName}
                  value={selectedNode.name ?? ""}
                  disabled={readOnly}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    onUpdateDraft(current => ({
                      ...current,
                      content: updateNodeInContent(current.content, selectedNodePath, node => ({ ...node, name: nextName })),
                    }));
                  }}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">描述</span>
                <textarea
                  className={`${textareaClassName} min-h-28`}
                  value={selectedNode.note ?? ""}
                  disabled={readOnly}
                  onChange={(event) => {
                    const nextNote = event.target.value;
                    onUpdateDraft(current => ({
                      ...current,
                      content: updateNodeInContent(current.content, selectedNodePath, node => ({ ...node, note: nextNote })),
                    }));
                  }}
                />
              </label>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium text-base-content/80">素材条目</div>
                </div>

                {(selectedNode.messages?.length ?? 0) > 0
                  ? (
                      <div className="space-y-3">
                        {(selectedNode.messages ?? []).map((message, index, messages) => {
                          const canDrag = canDragMessageToRoom(message);
                          const handleAssetDragStart = (event: DragEvent<HTMLDivElement>) => {
                            if (!canDrag) {
                              return;
                            }
                            const payload = buildAssetDragPayload(message, index);
                            if (!payload) {
                              event.preventDefault();
                              return;
                            }
                            event.dataTransfer.effectAllowed = "copy";
                            setMaterialItemDragData(event.dataTransfer, payload);
                          };
                          if (readOnly) {
                            return (
                              <div
                                key={getMessageDraftKey(messages, index, selectedNodeKey)}
                                className={canDrag ? "cursor-grab active:cursor-grabbing" : ""}
                                draggable={canDrag}
                                onDragStart={handleAssetDragStart}
                              >
                                <ReadOnlyAssetCard
                                  message={message}
                                  index={index}
                                />
                              </div>
                            );
                          }

                          return (
                            <div
                              key={getMessageDraftKey(messages, index, selectedNodeKey)}
                              className={`rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 ${canDrag ? "cursor-grab active:cursor-grabbing" : ""}`}
                              draggable={canDrag}
                              onDragStart={handleAssetDragStart}
                            >
                              <MaterialMessageEditorCard
                                message={message}
                                index={index}
                                availableRoles={availableRoles}
                                fallbackRoleId={fallbackRoleId}
                                fallbackAvatarId={fallbackAvatarId}
                                onChange={updater => updateSelectedMaterialMessage(index, updater)}
                                onDelete={() => removeSelectedMaterialMessage(index)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )
                  : (
                      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-4 py-6 text-center text-sm text-base-content/58">
                        {readOnly ? "当前素材还是草稿，还没有可查看的素材条目。" : "当前素材还是草稿，可以直接用下面的输入框和工具栏补充内容；右上角的附件入口也会汇入同一个输入框。"}
                      </div>
                    )}

                {!readOnly && (
                  <div ref={composerContainerRef}>
                    <MaterialMessageComposer
                      ref={composerRef}
                      composerKey={selectedNodeKey}
                      onAppendMessages={(messages) => {
                        updateSelectedMaterialMessages(current => [...current, ...messages]);
                      }}
                    />
                  </div>
                )}

                {!readOnly && (
                  <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-error">危险操作</div>
                        <div className="text-sm text-base-content/60">
                          删除后会移除当前素材及其内部全部素材条目。
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-error/30 bg-base-100 px-4 py-2.5 text-sm font-medium text-error transition hover:bg-error/10 sm:w-auto"
                        onClick={handleDeleteSelectedNode}
                      >
                        <TrashIcon className="size-4" />
                        <span>删除素材</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </MaterialComposerProvider>
        )}
      </section>
    </div>
  );
}
