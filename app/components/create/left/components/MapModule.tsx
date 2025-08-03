import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";

// 地图列表项组件
function MapListItem({
  map,
  onClick,
  isSelected,
}: {
  map: StageEntityResponse | null;
  onClick: () => void;
  isSelected: boolean;
}) {
  if (!map) {
    return (
      <div
        className="group w-full h-16 p-2 flex items-center justify-between cursor-pointer bg-gradient-to-r from-primary to-secondary hover:from-blue-500 hover:to-blue-600 rounded-lg my-2 shadow-md transition-all duration-200"
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <p className="self-baseline font-bold text-primary-content">+ 添加地图</p>
            <p className="text-xs text-primary-content/80 self-baseline mt-0.5">创建模组专属地图</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group w-full h-16 p-2 flex items-center justify-between bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 rounded-lg my-2 shadow-md transition-all duration-200 cursor-pointer ${isSelected ? "from-blue-500 to-blue-600" : "from-primary to-secondary"}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <p className="self-baseline font-bold text-primary-content">{map.name}</p>
        </div>
      </div>
      <div className="badge badge-outline text-primary-content border-primary-content">地图</div>
    </div>
  );
}

// 地图模块组件
export default function MapModule({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const { data } = useQueryEntitiesQuery(stageId);
  const { mutate: addMap } = useAddEntityMutation(5);

  // 查找地图实体
  const mapEntity = data?.data?.find(i => i.entityType === 5) || null;

  const handleClick = (map: StageEntityResponse) => {
    pushModuleTabItem({
      id: map.id!.toString(),
      label: map.name!,
      content: map,
      type: ModuleItemEnum.MAP,
    });
    setCurrentSelectedTabId(map.id!.toString());
  };

  const handleAddMap = () => {
    addMap({
      stageId,
      name: `${stageId}模组地图`,
      entityInfo: {
        sceneMap: [],
        sceneItem: [],
        sceneRole: [],
        sceneLocation: [],
      },
    });
  };

  return (
    <div className="py-2">
      <MapListItem
        map={mapEntity as StageEntityResponse}
        onClick={mapEntity ? () => handleClick(mapEntity) : handleAddMap}
        isSelected={currentSelectedTabId === mapEntity?.id?.toString()}
      />
    </div>
  );
}
