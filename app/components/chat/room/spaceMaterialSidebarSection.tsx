import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import type { MaterialNode } from "../../../../api/models/MaterialNode";
import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import { PackageIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useSpaceMaterialPackagesQuery } from "../../../../api/hooks/materialPackageQueryHooks";
import MaterialPackageImportModal from "@/components/material/components/materialPackageImportModal";
import { setMaterialItemDragData } from "@/components/chat/utils/materialItemRef";
import { ChevronDown } from "@/icons";

type FlattenedMaterialItem = {
  itemId: string;
  name: string;
  note?: string;
  path?: string;
  messages: MaterialMessageItem[];
};

type SpaceMaterialSidebarSectionProps = {
  spaceId: number | null;
};

function flattenMaterialNodes(
  nodes: MaterialNode[] | undefined,
  parentNames: string[] = [],
): FlattenedMaterialItem[] {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return [];
  }

  const result: FlattenedMaterialItem[] = [];

  nodes.forEach((node, index) => {
    const nodeName = typeof node.name === "string" ? node.name.trim() : "";
    if (node.type === "folder") {
      result.push(...flattenMaterialNodes(node.children, nodeName ? [...parentNames, nodeName] : parentNames));
      return;
    }

    if (node.type !== "material") {
      return;
    }

    const messages = Array.isArray(node.messages) ? node.messages : [];
    if (messages.length === 0) {
      return;
    }

    result.push({
      itemId: `${parentNames.join("/")}:${nodeName || "material"}:${index}`,
      name: nodeName || "未命名素材项",
      note: typeof node.note === "string" ? node.note.trim() : undefined,
      path: parentNames.length > 0 ? parentNames.join(" / ") : undefined,
      messages,
    });
  });

  return result;
}

function MaterialItemRow({
  spacePackageId,
  packageName,
  item,
}: {
  spacePackageId: number;
  packageName: string;
  item: FlattenedMaterialItem;
}) {
  return (
    <div
      className="group flex cursor-grab items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-base-300/55 active:cursor-grabbing"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        setMaterialItemDragData(event.dataTransfer, {
          spacePackageId,
          packageName,
          itemName: item.name,
          ...(item.note ? { itemNote: item.note } : {}),
          ...(item.path ? { itemPath: item.path } : {}),
          messages: item.messages,
        });
      }}
      title="拖拽发送到聊天室"
    >
      <div className="mt-1 size-2 rounded-full bg-primary/70" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-base-content">{item.name}</div>
        {item.path && (
          <div className="truncate text-[11px] text-base-content/50">{item.path}</div>
        )}
        {item.note && (
          <div className="truncate text-[11px] text-base-content/60">{item.note}</div>
        )}
        <div className="text-[11px] text-base-content/45">{`${item.messages.length} 条消息`}</div>
      </div>
    </div>
  );
}

function MaterialPackageGroup({
  item,
  expanded,
  onToggle,
}: {
  item: SpaceMaterialPackageResponse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const packageName = item.name?.trim() || "未命名局内素材包";
  const flattenedItems = useMemo(() => flattenMaterialNodes(item.content?.root), [item.content?.root]);

  return (
    <div className="rounded-lg border border-base-300 bg-base-100/55">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-base-content transition hover:bg-base-300/40"
        onClick={onToggle}
      >
        <ChevronDown className={`size-4 opacity-80 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <PackageIcon className="size-4 opacity-70" />
        <span className="min-w-0 flex-1 truncate">{packageName}</span>
        <span className="text-[11px] text-base-content/45">{`${flattenedItems.length} 个素材项`}</span>
      </button>

      {expanded && (
        <div className="border-t border-base-300 px-2 py-2">
          {flattenedItems.length === 0
            ? (
                <div className="px-3 py-2 text-xs text-base-content/55">这个局内素材包还没有可拖拽发送的素材项。</div>
              )
            : (
                <div className="space-y-1">
                  {flattenedItems.map(materialItem => (
                    <MaterialItemRow
                      key={`${item.spacePackageId}-${materialItem.itemId}`}
                      spacePackageId={item.spacePackageId ?? -1}
                      packageName={packageName}
                      item={materialItem}
                    />
                  ))}
                </div>
              )}
        </div>
      )}
    </div>
  );
}

export default function SpaceMaterialSidebarSection({
  spaceId,
}: SpaceMaterialSidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [expandedPackageIds, setExpandedPackageIds] = useState<Record<number, boolean>>({});

  const pageRequest = useMemo(() => ({
    pageNo: 1,
    pageSize: 100,
    spaceId: spaceId ?? -1,
  }), [spaceId]);

  const packagesQuery = useSpaceMaterialPackagesQuery(pageRequest, typeof spaceId === "number" && spaceId > 0);
  const packages = packagesQuery.data?.data?.list ?? [];

  useEffect(() => {
    setExpandedPackageIds((prev) => {
      const next: Record<number, boolean> = {};
      let changed = false;
      const packageIds = new Set<number>();

      packages.forEach((item) => {
        const packageId = item.spacePackageId ?? -1;
        if (!(packageId > 0)) {
          return;
        }
        packageIds.add(packageId);
        if (typeof prev[packageId] === "boolean") {
          next[packageId] = prev[packageId];
        }
        else {
          next[packageId] = true;
          changed = true;
        }
      });

      Object.keys(prev).forEach((rawKey) => {
        const packageId = Number(rawKey);
        if (!packageIds.has(packageId)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [packages]);

  if (!(typeof spaceId === "number" && spaceId > 0)) {
    return null;
  }

  return (
    <>
      <div className="mt-2 rounded-lg border border-base-300 bg-base-200/45">
        <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium opacity-80">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title={isExpanded ? "折叠素材包" : "展开素材包"}
            onClick={() => setIsExpanded(prev => !prev)}
          >
            <ChevronDown className={`size-4 opacity-80 ${isExpanded ? "" : "-rotate-90"}`} />
          </button>
          <span className="flex-1 truncate">素材包</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            title="导入局外素材包"
            onClick={() => setIsImportOpen(true)}
          >
            <PlusIcon className="size-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="border-t border-base-300 px-2 py-2">
            {packagesQuery.isLoading && (
              <div className="px-3 py-2 text-xs text-base-content/55">正在加载局内素材包...</div>
            )}

            {!packagesQuery.isLoading && packages.length === 0 && (
              <div className="px-3 py-2 text-xs text-base-content/55">当前空间还没有局内素材包，点击右上角 + 导入。</div>
            )}

            {!packagesQuery.isLoading && packages.length > 0 && (
              <div className="space-y-2">
                {packages.map((item) => {
                  const packageId = item.spacePackageId ?? -1;
                  if (!(packageId > 0)) {
                    return null;
                  }

                  return (
                    <MaterialPackageGroup
                      key={packageId}
                      item={item}
                      expanded={expandedPackageIds[packageId] !== false}
                      onToggle={() => {
                        setExpandedPackageIds(prev => ({
                          ...prev,
                          [packageId]: !(prev[packageId] !== false),
                        }));
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <MaterialPackageImportModal
        isOpen={isImportOpen}
        spaceId={spaceId}
        onClose={() => setIsImportOpen(false)}
      />
    </>
  );
}
