import LeftContent from "@/components/create/left";
import SideTopbar from "@/components/create/left/SideTopbar";
import { useEffect } from "react";
import { useParams } from "react-router";
import { ModuleProvider, useModuleContext } from "./context/_moduleContext";
import EditModule from "./EditModule";
import FunctionButtons from "./FunctionButtons";

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
      <div className="h-[calc(100vh-4rem)] flex bg-base-200 ">
        <SideTopbar />
        <div className="flex flex-1 h-full">
          <div className="bg-base-200 flex flex-col">
            <LeftContent />
          </div>
          <div className="bg-base-200 flex flex-col flex-1 overflow-y-scroll relative">
            <div className="max-w-7xl mx-auto w-full">
              <div className="absolute top-0 right-2 z-10">
                <FunctionButtons />
              </div>
              <EditModule />
            </div>
          </div>
          {/* <div className="bg-cyan-700 basis-1/5 flex flex-col overflow-hidden">
            AI 面板
          </div> */}
        </div>
      </div>
    </ModuleProvider>
  );
}
