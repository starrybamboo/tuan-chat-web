import type { StageResponse } from "api";
import { useStagingQuery } from "api/hooks/moduleAndStageQueryHooks";
// import { useModuleContext } from "@/components/module/workPlace/context/ModuleContext";
import { useEffect, useState } from "react";
import History from "./history";
import ModuleItems from "./moduleItems";

// interface LeftContentProps {
//   onChange?: (s: string) => void;
// }
function LeftContent() {
  const [moduleArray, setModuleArray] = useState<StageResponse[]>([]);
  const [editingStageId, setEditingStageId] = useState<number>(0);
  const { data: stagingData } = useStagingQuery();
  useEffect(() => {
    setModuleArray(stagingData?.data ?? []);
    setEditingStageId(moduleArray[0]?.stageId ?? 0);
  }, []);

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
        // onClick={
        //   () => {
        //     setModulePartition("StagingArea");
        //   }
        // }
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full rounded-none">
        <ModuleItems stageId={editingStageId} />
      </div>

      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="历史"
        // onClick={
        //   () => {
        //     setModulePartition("history");
        //   }
        // }
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full">
        <History />
      </div>
    </div>
  );
}

export default LeftContent;
