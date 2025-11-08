import MarkdownMentionViewer from "@/components/common/quillEditor/MarkdownMentionViewer";
import { useMemo, useState } from "react";
import { useContentPermission } from "./ContentPermissionContext";

interface EntityDetailProps {
  moduleInfo: any[];
}

const EntityDetail: React.FC<EntityDetailProps> = ({ moduleInfo }) => {
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const selectedEntityInfo = useMemo(() => {
    if (selectedEntityId === null || !Array.isArray(moduleInfo)) {
      return null;
    }
    const entity = moduleInfo.find((e: any) => e.id === selectedEntityId);
    return entity ? entity.entityInfo : null;
  }, [selectedEntityId, moduleInfo]);

  const selectedEntityName = useMemo(() => {
    if (selectedEntityId === null || !Array.isArray(moduleInfo)) {
      return null;
    }
    const entity = moduleInfo.find((e: any) => e.id === selectedEntityId);
    return entity ? entity.name : null;
  }, [selectedEntityId, moduleInfo]);

  const permission = useContentPermission();

  return (
    <div className="flex w-full flex-col max-w-screen md:min-h-32 bg-base-100">
      {/* 上方实体选择区 */}
      {Array.isArray(moduleInfo) && moduleInfo.length > 0 && (
        <div className="p-4 rounded-lg border border-base-300 bg-base-100">
          <h4 className="font-bold text-lg mb-4">请选择一个实体以查看详情：</h4>
          <div className="flex flex-wrap gap-2">
            {moduleInfo.map((entity: any, index: number) => (
              <span
                key={entity.id ?? `entity-${index}`}
                className={`bg-base-200 px-3 py-1 rounded-full text-sm font-medium cursor-pointer border border-gray-300 hover:ring-2 hover:ring-accent${selectedEntityId === entity.id ? " ring-2 ring-accent" : ""}`}
                onClick={() => setSelectedEntityId(entity.id)}
              >
                {entity.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* 下方详情区 */}
      <div className="p-4 rounded-lg border border-base-300 bg-base-100">
        <div className="flex items-center mb-2">
          <h4 className="font-bold text-lg mr-2">{selectedEntityName}</h4>
          {selectedEntityId !== null && (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-base-200 border border-base-300 align-middle">
              {(() => {
                const entity = moduleInfo.find((e: any) => e.id === selectedEntityId);
                const entityType = entity?.entityType;
                // 数字类型到字符串的映射
                const typeMap: Record<number, string> = {
                  1: "物品",
                  2: "角色",
                  3: "剧情",
                  4: "地点",
                };
                return typeMap[entityType] || "未知类型";
              })()}
            </span>
          )}
        </div>
        {selectedEntityId !== null
          ? (
              selectedEntityInfo
                ? (
                    <>
                      {selectedEntityInfo.image && (
                        <div className="mb-2">
                          <img
                            src={selectedEntityInfo.image}
                            alt={selectedEntityInfo.name || selectedEntityName || ""}
                            className="w-24 h-24 object-cover rounded"
                            onError={(e) => {
                              // 如果图片加载失败，使用默认图片
                              (e.target as HTMLImageElement).src = "/favicon.ico";
                            }}
                          />
                        </div>
                      )}
                      {selectedEntityInfo.description && (
                        <div className="mb-4">
                          <div className="font-semibold mb-2">描述：</div>
                          <div className="pl-2 border-l-2 border-base-300">
                            <MarkdownMentionViewer
                              markdown={selectedEntityInfo.description}
                            />
                          </div>
                        </div>
                      )}
                      {permission === "kp" && selectedEntityInfo.tip && (
                        <div className="mb-4">
                          <div className="font-semibold text-orange-600 mb-2">KP提示：</div>
                          <div className="pl-2 border-l-2 border-orange-300">
                            <MarkdownMentionViewer
                              markdown={selectedEntityInfo.tip}
                            />
                          </div>
                        </div>
                      )}
                      {/* 如果没有任何内容也提示暂无数据 */}
                      {!selectedEntityInfo.image && !selectedEntityInfo.description && (!selectedEntityInfo.tip || permission !== "kp") && (
                        <div className="text-base-content/50">暂无数据</div>
                      )}
                    </>
                  )
                : (
                    <div className="text-base-content/50">暂无数据</div>
                  )
            )
          : (
              <div className="text-base-content/50">请在上方选择一个实体以查看详情</div>
            )}
      </div>
    </div>
  );
};

export default EntityDetail;
