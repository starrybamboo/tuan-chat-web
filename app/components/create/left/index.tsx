import { useModuleContext } from "../workPlace/context/_moduleContext";
import { ModuleListEnum } from "../workPlace/context/types";
import ClueList from "./clueList";
import MapModule from "./components/MapModule";
import ModuleBasicInfo from "./components/ModuleBasicInfo";
import ModuleItems from "./moduleItems";

function LeftContent() {
  const { stageId: editingStageId, moduleId: editingModuleId, activeList } = useModuleContext();
  // 根据activeList渲染不同的内容

  const renderContent = () => {
    switch (activeList) {
      case ModuleListEnum.STAGE:
        return (
          <div className="w-80 h-full bg-base-100">
            {editingStageId
              ? <ModuleItems stageId={editingStageId as number} />
              : (
                  <div className="p-4">
                    <p className="text-gray-600">请先选择一个模组</p>
                  </div>
                )}
          </div>
        );

      case ModuleListEnum.MAP:
        return (
          <div className="w-80 h-full bg-base-100">
            {editingStageId
              ? (
                  <MapModule stageId={editingStageId as number} />
                )
              : (
                  <div className="p-4">
                    <p className="text-gray-600">请先选择一个模组以查看地图</p>
                  </div>
                )}
          </div>
        );
      case ModuleListEnum.CLUE:
        return (
          <div className="w-80 h-full bg-base-100">
            {editingModuleId
              ? (
                  <ClueList stageId={editingStageId as number} />
                )
              : (
                  <div className="p-4">
                    <p className="text-gray-600">请先选择一个模组</p>
                  </div>
                )}
          </div>
        );

      default:
        return (
          <div className="w-80 h-full bg-base-100">
            {editingModuleId
              ? (
                  <ModuleBasicInfo moduleId={editingModuleId as number} />
                )
              : (
                  <div className="p-4">
                    <p className="text-gray-600">请先选择一个模组</p>
                  </div>
                )}
          </div>
        );
    }
  };

  return (
    <div className="h-full border-t-1 border-base-300">
      {renderContent()}
    </div>
  );
}

export default LeftContent;
