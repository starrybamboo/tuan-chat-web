import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import type { MaterialNode } from "../../../../api/models/MaterialNode";
import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import {
  ArrowLeftIcon,
  CaretRightIcon,
  FileIcon,
  FolderSimpleIcon,
  PackageIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { MaterialNode as MaterialNodeModel } from "../../../../api/models/MaterialNode";
import MaterialPackageAssetUploadMenu from "./materialPackageAssetUploadMenu";
import {
  appendNodeToContent,
  collectFolderKeys,
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
  draft: MaterialPackageDraft;
  showPublicToggle: boolean;
  saveLabel: string;
  deleteLabel: string;
  savePending: boolean;
  deletePending: boolean;
  focusPathKey?: string | null;
  onBack: () => void;
  onUpdateDraft: (updater: (draft: MaterialPackageDraft) => MaterialPackageDraft) => void;
  onSave?: () => void;
  onDelete?: () => void;
}

function getMessageLabel(message: MaterialMessageItem, index: number) {
  switch (message.messageType) {
    case 2:
      return `图片素材 ${index + 1}`;
    case 7:
      return `音频素材 ${index + 1}`;
    case 14:
      return `视频素材 ${index + 1}`;
    case 3:
      return `文件素材 ${index + 1}`;
    default:
      return `素材条目 ${index + 1}`;
  }
}

export default function MaterialPackageWorkbench({
  draft,
  showPublicToggle,
  saveLabel,
  deleteLabel,
  savePending,
  deletePending,
  focusPathKey,
  onBack,
  onUpdateDraft,
  onSave,
  onDelete,
}: MaterialPackageWorkbenchProps) {
  const [selectedNodeKey, setSelectedNodeKey] = useState(ROOT_NODE_KEY);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [hasInitializedTree, setHasInitializedTree] = useState(false);
  const [draggedNodeKey, setDraggedNodeKey] = useState("");
  const [dropTargetKey, setDropTargetKey] = useState("");

  const rootNodes = useMemo(() => draft.content.root ?? [], [draft.content.root]);
  const selectedNodePath = useMemo(() => parseNodePath(selectedNodeKey), [selectedNodeKey]);
  const selectedNode = useMemo(
    () => (selectedNodeKey === ROOT_NODE_KEY ? null : getNodeAtPath(rootNodes, selectedNodePath)),
    [rootNodes, selectedNodeKey, selectedNodePath],
  );
  const selectedIsFolder = !selectedNode || selectedNode.type === MaterialNodeModel.type.FOLDER;
  const fieldClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-2.5 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
  const textareaClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-3 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  useEffect(() => {
    const folderKeys = collectFolderKeys(rootNodes);
    if (!hasInitializedTree) {
      setExpandedKeys(folderKeys);
      setHasInitializedTree(true);
      return;
    }

    const validKeys = new Set(folderKeys);
    setExpandedKeys(previous => previous.filter(key => validKeys.has(key)));
  }, [hasInitializedTree, rootNodes]);

  useEffect(() => {
    if (!focusPathKey) {
      return;
    }

    setSelectedNodeKey(focusPathKey);
    const path = parseNodePath(focusPathKey);
    setExpandedKeys((previous) => {
      const nextExpanded = new Set(previous);
      for (let index = 1; index <= path.length; index += 1) {
        nextExpanded.add(serializeNodePath(path.slice(0, index)));
      }
      return [...nextExpanded];
    });
  }, [focusPathKey]);

  useEffect(() => {
    if (selectedNodeKey === ROOT_NODE_KEY) {
      return;
    }

    if (!selectedNode) {
      setSelectedNodeKey(ROOT_NODE_KEY);
    }
  }, [selectedNode, selectedNodeKey]);

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

  const appendNode = (parentPath: number[], node: MaterialNode) => {
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
  };

  const handleAddFolder = () => {
    appendNode(selectedIsFolder ? selectedNodePath : [], createFolderNode());
  };

  const handleAddMaterial = () => {
    appendNode(selectedIsFolder ? selectedNodePath : [], createMaterialNode());
  };

  const handleDeleteSelectedNode = () => {
    if (selectedNodeKey === ROOT_NODE_KEY) {
      return;
    }

    const parentPath = selectedNodePath.slice(0, -1);
    onUpdateDraft(current => ({
      ...current,
      content: removeNodeFromContent(current.content, selectedNodePath),
    }));
    setSelectedNodeKey(parentPath.length > 0 ? serializeNodePath(parentPath) : ROOT_NODE_KEY);
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

      return (
        <div key={nodeKey} className="space-y-1">
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
              isSelected
                ? "bg-primary/10 text-primary"
                : "text-base-content/72 hover:bg-base-200 hover:text-base-content"
            } ${isDropTarget ? "ring-2 ring-primary/20" : ""}`}
            style={{ paddingLeft: 8 + depth * 16 }}
            onDragOver={(event) => {
              if (!draggedNodeKey || isInvalidDrop) {
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
              if (!draggedNodeKey || isInvalidDrop) {
                return;
              }
              event.preventDefault();
              finishNodeMove(draggedNodeKey, nodeKey, isFolder ? "inside" : "after");
            }}
          >
            <button
              type="button"
              className={`inline-flex size-5 items-center justify-center rounded ${isFolder ? "" : "opacity-0 pointer-events-none"}`}
              onClick={() => {
                if (isFolder) {
                  toggleFolder(nodeKey);
                }
              }}
            >
              <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => selectNode(nodeKey)}
              draggable
              onDragStart={(event) => {
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
                ? <FolderSimpleIcon className="size-4 shrink-0" weight={isSelected ? "fill" : "regular"} />
                : <FileIcon className="size-4 shrink-0" weight={isSelected ? "fill" : "regular"} />}
              <span className="truncate">{getNodeLabel(node, isFolder ? "未命名文件夹" : "未命名素材")}</span>
            </button>
          </div>

          {isFolder && isExpanded && node.children && node.children.length > 0 && (
            <div className="space-y-1">
              {renderTree(node.children, path, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex h-[78vh] min-h-[640px] flex-col">
      <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
            onClick={onBack}
          >
            <ArrowLeftIcon className="size-4" />
            <span>返回概览</span>
          </button>
          <div>
            <div className="text-sm font-medium text-base-content/60">素材编辑工作区</div>
            <div className="text-lg font-semibold text-base-content">{draft.name || "未命名素材包"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onDelete && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error"
              onClick={() => void onDelete()}
              disabled={deletePending}
            >
              {deletePending ? "删除中..." : deleteLabel}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
            onClick={() => void onSave?.()}
            disabled={savePending}
          >
            {savePending ? "保存中..." : saveLabel}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
        <aside className="border-r border-base-300 bg-base-200/55">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
            <div className="text-sm font-semibold text-base-content">文件树</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md border border-base-300 bg-base-100/80 text-base-content/65 transition hover:border-primary/30 hover:bg-base-100/90 hover:text-base-content"
                onClick={handleAddFolder}
                title="新增文件夹"
              >
                <FolderSimpleIcon className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md border border-base-300 bg-base-100/80 text-base-content/65 transition hover:border-primary/30 hover:bg-base-100/90 hover:text-base-content"
                onClick={handleAddMaterial}
                title="新增素材"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="h-full overflow-y-auto p-3">
            <div
              className={`mb-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                selectedNodeKey === ROOT_NODE_KEY
                  ? "bg-primary/10 text-primary"
                  : "text-base-content/72 hover:bg-base-200 hover:text-base-content"
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setSelectedNodeKey(ROOT_NODE_KEY)}
              >
                <PackageIcon className="size-4 shrink-0" weight={selectedNodeKey === ROOT_NODE_KEY ? "fill" : "regular"} />
                <span className="truncate">素材包根目录</span>
              </button>
            </div>

            <div className="space-y-1">
              {renderTree(rootNodes)}
            </div>

            <div
              className={`mt-3 rounded-md border border-dashed px-3 py-2 text-xs transition ${
                dropTargetKey === ROOT_NODE_KEY
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-base-300 text-base-content/45"
              }`}
              onDragOver={(event) => {
                if (!draggedNodeKey) {
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
                if (!draggedNodeKey) {
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
              拖拽到这里可移动到根目录
            </div>
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto bg-base-100/65 p-6">
          {selectedNodeKey === ROOT_NODE_KEY && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-base-content/60">当前节点</div>
                <h2 className="mt-2 text-2xl font-semibold text-base-content">素材包设置</h2>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">素材包名称</span>
                <input
                  type="text"
                  className={fieldClassName}
                  value={draft.name}
                  onChange={event => onUpdateDraft(current => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">描述</span>
                <textarea
                  className={`${textareaClassName} min-h-28`}
                  value={draft.description}
                  onChange={event => onUpdateDraft(current => ({ ...current, description: event.target.value }))}
                />
              </label>

              {showPublicToggle && (
                <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3">
                  <div>
                    <div className="font-medium text-base-content/90">公开至素材广场</div>
                    <div className="text-sm text-base-content/60">控制这个素材包是否可被其他创作者浏览。</div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                      draft.isPublic
                        ? "border-primary/40 bg-primary/90"
                        : "border-base-300 bg-base-100"
                    }`}
                    aria-pressed={draft.isPublic}
                    onClick={() => onUpdateDraft(current => ({ ...current, isPublic: !current.isPublic }))}
                  >
                    <span
                      className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                        draft.isPublic ? "translate-x-[1.45rem]" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                  onClick={handleAddFolder}
                >
                  <FolderSimpleIcon className="size-4" />
                  <span>在根目录新建文件夹</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                  onClick={handleAddMaterial}
                >
                  <PlusIcon className="size-4" />
                  <span>在根目录新建素材</span>
                </button>
              </div>
            </div>
          )}

          {selectedNode && selectedNode.type === MaterialNodeModel.type.FOLDER && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-base-content/60">当前节点</div>
                <h2 className="mt-2 text-2xl font-semibold text-base-content">文件夹设置</h2>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">文件夹名称</span>
                <input
                  type="text"
                  className={fieldClassName}
                  value={selectedNode.name ?? ""}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    onUpdateDraft(current => ({
                      ...current,
                      content: updateNodeInContent(current.content, selectedNodePath, node => ({ ...node, name: nextName })),
                    }));
                  }}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                  onClick={handleAddFolder}
                >
                  <FolderSimpleIcon className="size-4" />
                  <span>新建子文件夹</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                  onClick={handleAddMaterial}
                >
                  <PlusIcon className="size-4" />
                  <span>新建素材</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                  onClick={handleDeleteSelectedNode}
                >
                  <TrashIcon className="size-4" />
                  <span>删除文件夹</span>
                </button>
              </div>
            </div>
          )}

          {selectedNode && selectedNode.type === MaterialNodeModel.type.MATERIAL && (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-base-content/60">当前节点</div>
                <h2 className="mt-2 text-2xl font-semibold text-base-content">素材设置</h2>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-base-content/80">素材名称</span>
                <input
                  type="text"
                  className={fieldClassName}
                  value={selectedNode.name ?? ""}
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
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-base-content/80">素材条目</div>
                  <MaterialPackageAssetUploadMenu
                    onUploaded={(message) => {
                      onUpdateDraft(current => ({
                        ...current,
                        content: updateNodeInContent(current.content, selectedNodePath, node => ({
                          ...node,
                          messages: [...(node.messages ?? []), message],
                        })),
                      }));
                    }}
                  />
                </div>

                {(selectedNode.messages?.length ?? 0) > 0
                  ? (
                      <div className="space-y-3">
                        {(selectedNode.messages ?? []).map((message, index) => {
                          const messageKey = [
                            selectedNodeKey,
                            message.messageType ?? "item",
                            message.annotations?.join("-") ?? "",
                            getMessageLabel(message, index),
                          ].join("-");

                          return (
                            <div
                              key={messageKey}
                              className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-base-content">
                                  {getMessageLabel(message, index)}
                                </div>
                                <div className="text-xs text-base-content/55">
                                  {message.annotations?.join(" / ") || "无额外标记"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-full border border-base-300 bg-base-200/70 text-base-content/65 transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                                onClick={() => {
                                  onUpdateDraft(current => ({
                                    ...current,
                                    content: updateNodeInContent(current.content, selectedNodePath, node => ({
                                      ...node,
                                      messages: (node.messages ?? []).filter((_, messageIndex) => messageIndex !== index),
                                    })),
                                  }));
                                }}
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )
                  : (
                      <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/60 px-4 py-10 text-center text-sm text-base-content/58">
                        当前素材还没有条目，先从右上角的“添加素材”开始吧。
                      </div>
                    )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error"
                  onClick={handleDeleteSelectedNode}
                >
                  <TrashIcon className="size-4" />
                  <span>删除素材</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
