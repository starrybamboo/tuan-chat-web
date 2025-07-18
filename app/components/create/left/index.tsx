import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import History from "./history";
import ModuleItems from "./moduleItems";

function LeftContent() {
  const { stageId: editingStageId } = useModuleContext();

  return (
    <div className="tabs tabs-lift h-full">
      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="内容"
        defaultChecked
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full">
        {/* <ModuleItems /> */}
      </div>

      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="暂存区"
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full rounded-none">
        {editingStageId ? <ModuleItems stageId={editingStageId} /> : null}
      </div>

      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="历史"
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full">
        <History />
      </div>
    </div>
  );
}

export default LeftContent;
