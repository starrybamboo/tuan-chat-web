import type { DragEvent } from "react";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import type { MaterialSidebarVirtualNode } from "./materialSidebarTree";
import type { DraggingItem, DropTarget } from "./useRoomSidebarDragState";

import { CaretRightIcon, FileIcon, FolderSimpleIcon, PackageIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { buildMaterialSidebarTree, collectMaterialExpandableKeys } from "@/components/chat/room/materialSidebarTree";
import { setMaterialItemDragData } from "@/components/chat/utils/materialItemDrag";

interface RoomSidebarMaterialPackageItemProps {
  nodeId: string;
  categoryId: string;
  index: number;
  canEdit: boolean;
  dragging: DraggingItem | null;
  resetDropHandled: () => void;
  setDragging: (next: DraggingItem | null) => void;
  setDropTarget: (next: DropTarget | null) => void;
  handleDrop: () => void;
  materialPackageId: number;
  materialPackage?: SpaceMaterialPackageResponse;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
}

function MaterialTreeNodeRow({
  node,
  isExpanded,
  getNodeExpanded,
  onToggle,
  packageId,
  packageName,
  materialPackage,
}: {
  node: MaterialSidebarVirtualNode;
  isExpanded: boolean;
  getNodeExpanded: (key: string) => boolean;
  onToggle: (key: string) => void;
  packageId: number;
  packageName: string;
  materialPackage?: SpaceMaterialPackageResponse;
}) {
  const isFolder = node.kind === "folder";
  const hasChildren = node.children.length > 0;
  const rowStyle = { paddingLeft: 12 + node.depth * 16 };

  return (
    <div className="space-y-1">
      <div
        className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${isFolder ? "text-base-content/72 hover:bg-base-200 hover:text-base-content" : "cursor-grab text-base-content/78 hover:bg-base-200 hover:text-base-content active:cursor-grabbing"}`}
        style={rowStyle}
        role={isFolder ? "button" : undefined}
        tabIndex={isFolder ? 0 : -1}
        onClick={() => {
          if (isFolder) {
            onToggle(node.key);
          }
        }}
        onKeyDown={(event) => {
          if (!isFolder) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle(node.key);
          }
        }}
        draggable={!isFolder}
        onDragStart={(event) => {
          if (isFolder) {
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
          setMaterialItemDragData(event.dataTransfer, {
            spacePackageId: packageId,
            packageName,
            materialPathKey: node.path.join("."),
            materialName: node.label,
            messageCount: messages.length,
            messages: JSON.parse(JSON.stringify(messages)),
          });
        }}
      >
        <span className={`inline-flex size-4 items-center justify-center ${isFolder ? "" : "opacity-0"}`}>
          {isFolder && hasChildren && (
            <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
          )}
        </span>
        {isFolder
          ? <FolderSimpleIcon className="size-4 shrink-0" weight={isExpanded ? "fill" : "regular"} />
          : <FileIcon className="size-4 shrink-0" weight="regular" />}
        <span className="min-w-0 flex-1 truncate text-left">{node.label}</span>
        {!isFolder && (
          <span className="shrink-0 text-[11px] text-base-content/45">
            {`${node.messageCount} 条`}
          </span>
        )}
      </div>

      {isFolder && isExpanded && node.children.map(child => (
        <MaterialTreeNodeRow
          key={child.key}
          node={child}
          isExpanded={getNodeExpanded(child.key)}
          getNodeExpanded={getNodeExpanded}
          onToggle={onToggle}
          packageId={packageId}
          packageName={packageName}
          materialPackage={materialPackage}
        />
      ))}
    </div>
  );
}

export default function RoomSidebarMaterialPackageItem({
  nodeId,
  categoryId,
  index,
  canEdit,
  dragging,
  resetDropHandled,
  setDragging,
  setDropTarget,
  handleDrop,
  materialPackageId,
  materialPackage,
  fallbackTitle,
  fallbackImageUrl,
}: RoomSidebarMaterialPackageItemProps) {
  const packageName = materialPackage?.name?.trim() || fallbackTitle || `素材包 #${materialPackageId}`;
  const coverUrl = materialPackage?.coverUrl?.trim() || fallbackImageUrl || "";
  const treeNodes = useMemo(() => {
    return buildMaterialSidebarTree({
      spacePackageId: materialPackageId,
      nodes: materialPackage?.content?.root,
    });
  }, [materialPackage?.content?.root, materialPackageId]);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const packageRootKey = `material-package:${materialPackageId}`;
  const validExpandableKeys = useMemo(() => {
    return new Set([packageRootKey, ...collectMaterialExpandableKeys(treeNodes)]);
  }, [packageRootKey, treeNodes]);
  const isExpanded = Boolean(expandedKeys[packageRootKey]);

  useEffect(() => {
    setExpandedKeys((previous) => {
      const nextEntries = Object.entries(previous).filter(([key]) => validExpandableKeys.has(key));
      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [validExpandableKeys]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys(previous => ({ ...previous, [key]: !previous[key] }));
  };
  const getNodeExpanded = (key: string) => Boolean(expandedKeys[key]);

  const handlePackageDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!canEdit) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `material-package:${materialPackageId}`);
    resetDropHandled();
    setDragging({
      kind: "node",
      nodeId,
      type: "material-package",
      fromCategoryId: categoryId,
      fromIndex: index,
    });
    setDropTarget(null);
  };

  return (
    <div className="space-y-1">
      <div
        className="group relative flex w-full min-w-0 select-none items-center gap-2 rounded-lg p-1 pr-3 text-sm font-medium text-base-content/78 hover:bg-base-300 hover:text-base-content"
        role="button"
        tabIndex={0}
        onClick={() => toggleExpanded(packageRootKey)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleExpanded(packageRootKey);
          }
        }}
        onDragOver={(event) => {
          if (!canEdit || !dragging || dragging.kind !== "node") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
          const isBefore = (event.clientY - rect.top) < rect.height / 2;
          setDropTarget({ kind: "node", toCategoryId: categoryId, insertIndex: isBefore ? index : index + 1 });
        }}
        onDrop={(event) => {
          if (!canEdit) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          handleDrop();
        }}
        draggable={canEdit}
        onDragStart={handlePackageDragStart}
        onDragEnd={() => {
          if (!canEdit) {
            return;
          }
          setDragging(null);
          setDropTarget(null);
        }}
      >
        <span className="inline-flex size-4 items-center justify-center">
          <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
        </span>
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
                  onToggle={toggleExpanded}
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
