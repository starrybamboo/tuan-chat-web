import LeftContent from "@/components/create/left";
import SideTopbar from "@/components/create/left/SideTopbar";
import { useStagingQuery } from "api/hooks/moduleQueryHooks";
import { useEffect } from "react";
import { useParams } from "react-router";
import { ModuleProvider, useModuleContext } from "./context/_moduleContext";
import EditModule from "./EditModule";
import FunctionButtons from "./FunctionButtons";

// 将原 Work 的编辑布局迁移为 MainWork，并移除 TopBar。
// 进入该页时，从路由参数里读取 stageId，并写入模块上下文。

function StageInitializer() {
  const { editingStageId } = useParams();
  const { setStageId, setModuleId, stageId, moduleId } = useModuleContext();
  const { data: stagingData } = useStagingQuery();

  useEffect(() => {
    const id = Number.parseInt(editingStageId ?? "0", 10);
    if (!Number.isNaN(id) && id > 0 && id !== stageId) {
      setStageId(id);
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("editingStageId", id.toString());
      }
    }
  }, [editingStageId, stageId, setStageId]);

  // 当 stageId 变化时，从 staging 数据中找到对应的 moduleId
  useEffect(() => {
    if (stageId && stagingData?.data) {
      const stageInfo = stagingData.data.find(stage => stage.stageId === stageId);
      if (stageInfo?.moduleId && stageInfo.moduleId !== moduleId) {
        setModuleId(stageInfo.moduleId);
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem("currentModuleId", stageInfo.moduleId.toString());
        }
      }
    }
  }, [stageId, stagingData, moduleId, setModuleId]);

  return null;
}

export default function MainWork() {
  return (
    <ModuleProvider>
      <StageInitializer />
      <div className="h-[calc(100vh-4rem)] flex bg-base-200">
        <SideTopbar />
        <div className="flex flex-1 h-full">
          <div className="bg-base-200 w-80 flex flex-col h-full">
            <div className="flex-shrink-0">
              <FunctionButtons />
            </div>
            <div className="flex-1 overflow-y-auto">
              <LeftContent />
            </div>
          </div>
          <div className="bg-base-200 flex flex-col flex-1 overflow-y-auto relative">
            <div className="w-full">
              <EditModule />
            </div>
          </div>
        </div>
      </div>
    </ModuleProvider>
  );
}
