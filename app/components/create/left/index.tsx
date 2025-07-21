import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleListEnum } from "@/components/module/workPlace/context/types";
import History from "./history";
import ModuleItems from "./moduleItems";

function LeftContent() {
  const { stageId: editingStageId, activeList } = useModuleContext();
  // 根据activeList渲染不同的内容

  const renderContent = () => {
    switch (activeList) {
      // case ModuleListEnum.CONTENT:
      //   return (
      //     <div className="h-full bg-base-100 p-4">
      //       <h3 className="text-lg font-semibold mb-4">内容查看</h3>
      //       {/* 这里可以添加内容管理的具体组件 */}
      //       <p className="text-gray-600">内容管理功能开发中...</p>
      //     </div>
      //   );

      case ModuleListEnum.STAGE:
        return (
          <div className="h-full bg-base-100">
            {editingStageId
              ? <ModuleItems stageId={editingStageId} />
              : (
                  <div className="p-4">
                    <p className="text-gray-600">请先选择一个模组</p>
                  </div>
                )}
          </div>
        );

      case ModuleListEnum.HISTORY:
        return (
          <div className="h-full bg-base-100">
            <History />
          </div>
        );

      case ModuleListEnum.BRANCH:
        return (
          <div className="h-full bg-base-100 p-4">
            <h3 className="text-lg font-semibold mb-4">分支管理</h3>
            {/* 这里可以添加分支管理的具体组件 */}
            <p className="text-gray-600">分支管理功能开发中...</p>
          </div>
        );

      default:
        return (
          <div className="h-full bg-base-100 p-4">
            <p className="text-gray-600">未知的列表类型</p>
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
