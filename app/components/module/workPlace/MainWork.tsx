import LeftContent from "@/components/create/left";
import Topbar from "@/components/create/sidebar/sidebar";
import { useEffect } from "react";
import { useParams } from "react-router";
import { ModuleProvider, useModuleContext } from "./context/_moduleContext";
import EditModule from "./EditModule";

// 将原 Work 的编辑布局迁移为 MainWork，并移除 TopBar。
// 进入该页时，从路由参数里读取 stageId，并写入模块上下文。

function StageInitializer() {
  const { editingStageId } = useParams();
  const { setStageId, stageId } = useModuleContext();

  useEffect(() => {
    const id = Number.parseInt(editingStageId ?? "0", 10);
    if (!Number.isNaN(id) && id > 0 && id !== stageId) {
      setStageId(id);
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("editingStageId", id.toString());
      }
    }
  }, [editingStageId, stageId, setStageId]);

  return null;
}

export default function MainWork() {
  return (
    <ModuleProvider>
      <StageInitializer />
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-base-200 overflow-hidden">
        <Topbar />
        <div className="flex flex-1 min-h-0">
          <div className="bg-base-300 basis-1/5 flex flex-col overflow-hidden">
            <LeftContent />
          </div>
          <div className="basis-3/5 flex flex-col overflow-hidden">
            <EditModule />
          </div>
          <div className="bg-cyan-700 basis-1/5 flex flex-col overflow-hidden">
            AI 面板
          </div>
        </div>
      </div>
    </ModuleProvider>
  );
}
