import { useMemo, useState } from "react";

interface EntityDetailProps {
  moduleInfo: any[];
}

const EntityDetail: React.FC<EntityDetailProps> = ({ moduleInfo }) => {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const selectedEntityInfo = useMemo(() => {
    if (!selectedEntity || !Array.isArray(moduleInfo)) {
      return null;
    }
    const entity = moduleInfo.find((e: any) => e.name === selectedEntity);
    return entity ? entity.entityInfo : null;
  }, [selectedEntity, moduleInfo]);

  return (
    <div className="flex w-full flex-col max-w-screen md:min-h-32 bg-base-100">
      {/* 上方实体选择区 */}
      {Array.isArray(moduleInfo) && moduleInfo.length > 0 && (
        <div className="p-4 rounded-lg border border-base-300 bg-base-100">
          <h4 className="font-bold text-lg mb-4 text-primary">请选择一个实体以查看详情：</h4>
          <div className="flex flex-wrap gap-2">
            {moduleInfo.map((entity: any) => (
              <span
                key={entity.name}
                className={`bg-base-200 text-gray-800 px-3 py-1 rounded-full text-sm font-medium cursor-pointer border border-gray-300 hover:ring-2 hover:ring-primary${selectedEntity === entity.name ? " ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedEntity(entity.name)}
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
          <h4 className="font-bold text-lg text-primary mr-2">{selectedEntity}</h4>
          {selectedEntity && (
            <span className="px-2 py-1 rounded text-xs font-semibold bg-base-200 text-base-content/70 border border-base-300 align-middle">
              {(() => {
                const entity = moduleInfo.find((e: any) => e.name === selectedEntity);
                return entity?.entityType || "未知类型";
              })()}
            </span>
          )}
        </div>
        {selectedEntity
          ? (
              selectedEntityInfo
                ? (
                    <>
                      {selectedEntityInfo.image && (
                        <div className="mb-2">
                          <img src={selectedEntityInfo.image} alt={selectedEntityInfo.name || selectedEntity || ""} className="w-24 h-24 object-cover rounded" />
                        </div>
                      )}
                      {selectedEntityInfo.description && (
                        <div className="mb-2">
                          <span className="font-semibold text-base-content/70">描述：</span>
                          <span>{selectedEntityInfo.description}</span>
                        </div>
                      )}
                      {selectedEntityInfo.tip && (
                        <div className="mb-2">
                          <span className="font-semibold text-orange-600">KP提示：</span>
                          <span>{selectedEntityInfo.tip}</span>
                        </div>
                      )}
                      {/* 如果没有任何内容也提示暂无数据 */}
                      {!selectedEntityInfo.image && !selectedEntityInfo.description && !selectedEntityInfo.tip && (
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
