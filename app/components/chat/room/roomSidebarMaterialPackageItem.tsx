import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";
import type { MaterialSidebarVirtualNode } from "./materialSidebarTree";

import { CaretRightIcon, FileIcon, FolderPlusIcon, FolderSimpleIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { buildMaterialSidebarTree } from "@/components/chat/room/materialSidebarTree";
import { setMaterialItemDragData } from "@/components/chat/utils/materialItemDrag";
import { setSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";
import { parseNodePath, serializeNodePath } from "@/components/material/components/materialPackageTreeUtils";

interface RoomSidebarMaterialPackageItemProps {
  materialPackageId: number;
  materialPackage?: SpaceMaterialPackageResponse;
  isActivePackage?: boolean;
  activeNodePathKey?: string | null;
  onCreateFolderAtRoot?: () => void;
  onCreateMaterialAtRoot?: () => void;
  onCreateFolderAtNode?: (materialPathKey: string) => void;
  onCreateMaterialAtNode?: (materialPathKey: string) => void;
  expandedState: Record<string, boolean> | null;
  onToggleExpanded: (key: string) => void;
  onOpenPackageDetail: () => void;
  onOpenNodeDetail: (materialPathKey: string) => void;
}

export function isMaterialNodeOnActivePath(nodePathKey: string, activeNodePathKey?: string | null) {
  const normalizedNodePathKey = serializeNodePath(parseNodePath(nodePathKey));
  const normalizedActiveNodePathKey = serializeNodePath(parseNodePath(activeNodePathKey ?? ""));
  if (!normalizedNodePathKey || !normalizedActiveNodePathKey) {
    return false;
  }
  return normalizedActiveNodePathKey === normalizedNodePathKey
    || normalizedActiveNodePathKey.startsWith(`${normalizedNodePathKey}.`);
}

function MaterialTreeNodeRow({
  node,
  isExpanded,
  getNodeExpanded,
  activeNodePathKey,
  onCreateFolderAtNode,
  onCreateMaterialAtNode,
  onToggle,
  onOpenNode,
  packageId,
  packageName,
  materialPackage,
}: {
  node: MaterialSidebarVirtualNode;
  isExpanded: boolean;
  getNodeExpanded: (key: string) => boolean;
  activeNodePathKey?: string | null;
  onCreateFolderAtNode?: (materialPathKey: string) => void;
  onCreateMaterialAtNode?: (materialPathKey: string) => void;
  onToggle: (key: string) => void;
  onOpenNode: (materialPathKey: string) => void;
  packageId: number;
  packageName: string;
  materialPackage?: SpaceMaterialPackageResponse;
}) {
  const isFolder = node.kind === "folder";
  const isMaterialGroup = node.kind === "material";
  const hasChildren = node.children.length > 0;
  const canExpand = hasChildren && isFolder;
  const isDraggable = isMaterialGroup && node.messageCount > 0;
  const isInteractive = isFolder || isMaterialGroup;
  const materialPathKey = node.path.join(".");
  const isActiveNode = activeNodePathKey === materialPathKey;
  const isActionPinned = isMaterialNodeOnActivePath(materialPathKey, activeNodePathKey);
  const showNodeCreateActions = isFolder && Boolean(onCreateFolderAtNode || onCreateMaterialAtNode);
  const rowCursorClassName = isDraggable
    ? "cursor-pointer active:cursor-grabbing"
    : isInteractive
      ? "cursor-pointer"
      : "";
  // 贴近 VSCode 的树结构缩进，避免素材包子项整体挂得过右。
  const rowStyle = { paddingLeft: 4 + Math.max(node.depth - 1, 0) * 12 };

  return (
    <div className="space-y-1">
      <div
        className={`group flex min-w-0 items-start gap-1.5 rounded-md px-1.5 py-1.5 text-sm transition ${isActiveNode ? "bg-primary/10 text-primary" : "text-base-content/72 hover:bg-base-200 hover:text-base-content"}`}
        style={rowStyle}
      >
        <button
          type="button"
          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm ${canExpand ? "text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88" : "pointer-events-none opacity-0"}`}
          tabIndex={canExpand ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            if (canExpand) {
              onToggle(node.key);
            }
          }}
          aria-label={canExpand ? (isExpanded ? "收起文件夹" : "展开文件夹") : undefined}
        >
          {canExpand && (
            <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
          )}
        </button>
        <button
          type="button"
          className={`flex min-w-0 flex-1 items-start gap-1.5 text-left ${rowCursorClassName}`}
          role={isInteractive ? "button" : undefined}
          tabIndex={isInteractive ? 0 : -1}
          onClick={() => {
            if (isInteractive) {
              onOpenNode(materialPathKey);
            }
          }}
          onKeyDown={(event) => {
            if (!isInteractive) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenNode(materialPathKey);
            }
          }}
          draggable={isDraggable}
          onDragStart={(event) => {
            if (!isDraggable) {
              return;
            }

            const contentNode = node.path.reduce<any>((current, childIndex) => {
              const source = Array.isArray(current) ? current : current?.children;
              return Array.isArray(source) ? source[childIndex] : null;
            }, materialPackage?.content?.root ?? []);
            const messages = Array.isArray(contentNode?.messages) ? contentNode.messages : [];
            if (!messages.length) {
              event.preventDefault();
              return;
            }
            event.dataTransfer.effectAllowed = "copy";
            setSubWindowDragPayload({
              tab: "material",
              spacePackageId: packageId,
              materialPathKey,
            });
            setMaterialItemDragData(event.dataTransfer, {
              itemKind: "material",
              spacePackageId: packageId,
              packageName,
              materialPathKey,
              materialName: node.label,
              messageCount: messages.length,
              assetIndex: undefined,
              messages: JSON.parse(JSON.stringify(messages)),
            });
          }}
          onDragEnd={() => {
            setSubWindowDragPayload(null);
          }}
        >
          {isFolder
            ? <FolderSimpleIcon className="mt-0.5 size-4 shrink-0" weight={isExpanded || isActiveNode ? "fill" : "regular"} />
            : <FileIcon className="mt-0.5 size-4 shrink-0" weight={isMaterialGroup || isActiveNode ? "fill" : "regular"} />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-left">{node.label}</div>
            {node.meta && (
              <div className={`truncate text-[11px] ${isActiveNode ? "text-primary/75" : "text-base-content/45"}`}>
                {node.meta}
              </div>
            )}
          </div>
          {isMaterialGroup && (
            <span className={`mt-0.5 shrink-0 text-[11px] ${isActiveNode ? "text-primary/75" : "text-base-content/45"}`}>
              {`${node.messageCount} 条`}
            </span>
          )}
        </button>
        {showNodeCreateActions && (
          <div className={`ml-1 flex shrink-0 items-center gap-1 transition ${isActionPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            {onCreateFolderAtNode && (
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88"
                title="在此文件夹下新建文件夹"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateFolderAtNode(materialPathKey);
                }}
              >
                <FolderPlusIcon className="size-3.5" />
              </button>
            )}
            {onCreateMaterialAtNode && (
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded-sm text-base-content/60 transition hover:bg-base-100/70 hover:text-base-content/88"
                title="在此文件夹下新建素材"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateMaterialAtNode(materialPathKey);
                }}
              >
                <PlusIcon className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {canExpand && isExpanded && node.children.map(child => (
        <MaterialTreeNodeRow
          key={child.key}
          node={child}
          isExpanded={getNodeExpanded(child.key)}
          getNodeExpanded={getNodeExpanded}
          activeNodePathKey={activeNodePathKey}
          onCreateFolderAtNode={onCreateFolderAtNode}
          onCreateMaterialAtNode={onCreateMaterialAtNode}
          onToggle={onToggle}
          onOpenNode={onOpenNode}
          packageId={packageId}
          packageName={packageName}
          materialPackage={materialPackage}
        />
      ))}
    </div>
  );
}

function getForcedExpandedKeys(materialPackageId: number, activeNodePathKey?: string | null) {
  const normalizedPath = serializeNodePath(parseNodePath(activeNodePathKey ?? ""));
  if (!normalizedPath) {
    return new Set<string>();
  }
  const path = parseNodePath(normalizedPath);
  return new Set(
    path.slice(0, -1).map((_, index) => `material-package:${materialPackageId}:${serializeNodePath(path.slice(0, index + 1))}`),
  );
}

export default function RoomSidebarMaterialPackageItem({
  materialPackageId,
  materialPackage,
  isActivePackage = false,
  activeNodePathKey,
  onCreateFolderAtRoot,
  onCreateMaterialAtRoot,
  onCreateFolderAtNode,
  onCreateMaterialAtNode,
  expandedState,
  onToggleExpanded,
  onOpenPackageDetail,
  onOpenNodeDetail,
}: RoomSidebarMaterialPackageItemProps) {
  const packageName = materialPackage?.name?.trim() || `素材包 #${materialPackageId}`;
  const coverUrl = materialPackage?.coverUrl?.trim() || "";
  const normalizedActiveNodePathKey = useMemo(() => {
    const normalized = serializeNodePath(parseNodePath(activeNodePathKey ?? ""));
    return normalized || null;
  }, [activeNodePathKey]);
  const forcedExpandedKeys = useMemo(
    () => getForcedExpandedKeys(materialPackageId, normalizedActiveNodePathKey),
    [materialPackageId, normalizedActiveNodePathKey],
  );
  const treeNodes = useMemo(() => {
    return buildMaterialSidebarTree({
      spacePackageId: materialPackageId,
      nodes: materialPackage?.content?.root,
    });
  }, [materialPackage?.content?.root, materialPackageId]);
  const packageRootKey = `material-package:${materialPackageId}`;
  const isExpanded = Boolean(expandedState?.[packageRootKey]) || isActivePackage;
  const isPackageSelected = isActivePackage && !normalizedActiveNodePathKey;
  const getNodeExpanded = (key: string) => Boolean(expandedState?.[key]) || forcedExpandedKeys.has(key);
  const showRootCreateActions = isActivePackage && Boolean(onCreateFolderAtRoot || onCreateMaterialAtRoot);

  return (
    <div className="space-y-1">
      <div className="group flex w-full min-w-0 items-center gap-1">
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-base-content/62 transition hover:bg-base-300 hover:text-base-content"
          onClick={() => onToggleExpanded(packageRootKey)}
          aria-label={isExpanded ? "收起素材包结构" : "展开素材包结构"}
          aria-pressed={isExpanded}
        >
          <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
        </button>
        <button
          type="button"
          className={`group relative flex min-w-0 flex-1 cursor-pointer select-none items-center gap-1.5 rounded-lg px-1 py-1 pr-2 text-left text-sm font-medium transition ${isPackageSelected ? "bg-primary/10 text-primary" : isActivePackage ? "bg-base-300/45 text-base-content" : "text-base-content/78 hover:bg-base-300 hover:text-base-content"}`}
          onClick={onOpenPackageDetail}
        >
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-md border border-base-300/60 bg-base-100">
            {coverUrl
              ? (
                  <img
                    src={coverUrl}
                    alt={packageName}
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                )
              : (
                  <PackageIcon className="size-4 opacity-70" weight="duotone" />
                )}
          </div>
          <span className="flex-1 truncate text-left">{packageName}</span>
        </button>
        {showRootCreateActions && (
          <div className="flex shrink-0 items-center gap-1">
            {onCreateFolderAtRoot && (
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-md text-base-content/60 transition hover:bg-base-300 hover:text-base-content"
                title="在素材包根目录下新建文件夹"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateFolderAtRoot();
                }}
              >
                <FolderPlusIcon className="size-4" />
              </button>
            )}
            {onCreateMaterialAtRoot && (
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center rounded-md text-base-content/60 transition hover:bg-base-300 hover:text-base-content"
                title="在素材包根目录下新建素材"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateMaterialAtRoot();
                }}
              >
                <PlusIcon className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1">
          {treeNodes.length > 0
            ? treeNodes.map(node => (
                <MaterialTreeNodeRow
                  key={node.key}
                  node={node}
                  isExpanded={getNodeExpanded(node.key)}
                  getNodeExpanded={getNodeExpanded}
                  activeNodePathKey={normalizedActiveNodePathKey}
                  onCreateFolderAtNode={onCreateFolderAtNode}
                  onCreateMaterialAtNode={onCreateMaterialAtNode}
                  onToggle={onToggleExpanded}
                  onOpenNode={onOpenNodeDetail}
                  packageId={materialPackageId}
                  packageName={packageName}
                  materialPackage={materialPackage}
                />
              ))
            : (
                <div className="px-8 py-1 text-xs text-base-content/45">
                  当前素材包还没有可拖拽的素材条目
                </div>
              )}
        </div>
      )}
    </div>
  );
}
