import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import type { MaterialSidebarVirtualNode } from "./materialSidebarTree";

import { CaretRightIcon, FileIcon, FolderSimpleIcon, PackageIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { buildMaterialSidebarTree } from "@/components/chat/room/materialSidebarTree";
import { setMaterialItemDragData } from "@/components/chat/utils/materialItemDrag";
import { setSubWindowDragPayload } from "@/components/chat/utils/subWindowDragPayload";

interface RoomSidebarMaterialPackageItemProps {
  materialPackageId: number;
  materialPackage?: SpaceMaterialPackageResponse;
  expandedState: Record<string, boolean> | null;
  onToggleExpanded: (key: string) => void;
  onOpenPackageDetail: () => void;
  onOpenMaterialDetail: (materialPathKey: string) => void;
}

function MaterialTreeNodeRow({
  node,
  isExpanded,
  getNodeExpanded,
  onToggle,
  onOpenMaterial,
  packageId,
  packageName,
  materialPackage,
}: {
  node: MaterialSidebarVirtualNode;
  isExpanded: boolean;
  getNodeExpanded: (key: string) => boolean;
  onToggle: (key: string) => void;
  onOpenMaterial: (materialPathKey: string) => void;
  packageId: number;
  packageName: string;
  materialPackage?: SpaceMaterialPackageResponse;
}) {
  const isFolder = node.kind === "folder";
  const isMaterialGroup = node.kind === "material";
  const hasChildren = node.children.length > 0;
  const canExpand = hasChildren && isFolder;
  const isDraggable = isMaterialGroup && node.messageCount > 0;
  const isInteractive = canExpand || isMaterialGroup;
  const materialPathKey = node.path.join(".");
  // 贴近 VSCode 的树结构缩进，避免素材包子项整体挂得过右。
  const rowStyle = { paddingLeft: 4 + Math.max(node.depth - 1, 0) * 12 };

  return (
    <div className="space-y-1">
      <div
        className={`flex min-w-0 items-start gap-1.5 rounded-md px-1.5 py-1.5 text-sm transition ${isDraggable ? "cursor-grab text-base-content/78 hover:bg-base-200 hover:text-base-content active:cursor-grabbing" : "text-base-content/72 hover:bg-base-200 hover:text-base-content"}`}
        style={rowStyle}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : -1}
        onClick={() => {
          if (canExpand) {
            onToggle(node.key);
            return;
          }
          if (isMaterialGroup) {
            onOpenMaterial(materialPathKey);
          }
        }}
        onKeyDown={(event) => {
          if (!isInteractive) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (canExpand) {
              onToggle(node.key);
              return;
            }
            if (isMaterialGroup) {
              onOpenMaterial(materialPathKey);
            }
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
        <span className={`mt-0.5 inline-flex size-4 items-center justify-center ${canExpand ? "" : "opacity-0"}`}>
          {canExpand && (
            <CaretRightIcon className={`size-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} weight="bold" />
          )}
        </span>
        {isFolder
          ? <FolderSimpleIcon className="mt-0.5 size-4 shrink-0" weight={isExpanded ? "fill" : "regular"} />
          : <FileIcon className="mt-0.5 size-4 shrink-0" weight={isMaterialGroup ? "fill" : "regular"} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-left">{node.label}</div>
        {node.meta && (
          <div className="truncate text-[11px] text-base-content/45">
            {node.meta}
          </div>
        )}
      </div>
        {isMaterialGroup && (
          <span className="mt-0.5 shrink-0 text-[11px] text-base-content/45">
            {`${node.messageCount} 条`}
          </span>
        )}
      </div>

      {canExpand && isExpanded && node.children.map(child => (
        <MaterialTreeNodeRow
          key={child.key}
          node={child}
          isExpanded={getNodeExpanded(child.key)}
          getNodeExpanded={getNodeExpanded}
          onToggle={onToggle}
          onOpenMaterial={onOpenMaterial}
          packageId={packageId}
          packageName={packageName}
          materialPackage={materialPackage}
        />
      ))}
    </div>
  );
}

export default function RoomSidebarMaterialPackageItem({
  materialPackageId,
  materialPackage,
  expandedState,
  onToggleExpanded,
  onOpenPackageDetail,
  onOpenMaterialDetail,
}: RoomSidebarMaterialPackageItemProps) {
  const packageName = materialPackage?.name?.trim() || `素材包 #${materialPackageId}`;
  const coverUrl = materialPackage?.coverUrl?.trim() || "";
  const treeNodes = useMemo(() => {
    return buildMaterialSidebarTree({
      spacePackageId: materialPackageId,
      nodes: materialPackage?.content?.root,
    });
  }, [materialPackage?.content?.root, materialPackageId]);
  const packageRootKey = `material-package:${materialPackageId}`;
  const isExpanded = Boolean(expandedState?.[packageRootKey]);
  const getNodeExpanded = (key: string) => Boolean(expandedState?.[key]);

  return (
    <div className="space-y-1">
      <div className="flex w-full min-w-0 items-center gap-1">
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
          className="group relative flex min-w-0 flex-1 select-none items-center gap-1.5 rounded-lg px-1 py-1 pr-2 text-left text-sm font-medium text-base-content/78 transition hover:bg-base-300 hover:text-base-content"
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
                  onToggle={onToggleExpanded}
                  onOpenMaterial={onOpenMaterialDetail}
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
