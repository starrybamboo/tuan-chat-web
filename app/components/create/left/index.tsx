import type { StageResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { useStagingQuery } from "api/hooks/moduleQueryHooks";
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
  const { setStageId } = useModuleContext();
  const { data: stagingData, isSuccess } = useStagingQuery();
  useEffect(() => {
    if (isSuccess && stagingData.data!.length > 0) {
      setModuleArray(stagingData.data!);
      setEditingStageId(moduleArray[0]?.stageId ?? 0);
    }
  }, [isSuccess, moduleArray, stagingData]);

  const handleModuleChange = (stageId: number) => {
    setEditingStageId(stageId);
  };

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
      {/* 下拉菜单紧跟在历史tab后面，不加tab-content，不影响原有结构 */}
      <details className="dropdown">
        <summary className="tab min-w-18! rounded-l-none -ml-px">选择模组</summary>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          {moduleArray.map((item: StageResponse) => (
            <li key={item.stageId}>
              <a
                onClick={() => {
                  handleModuleChange(item.stageId as number);
                  setStageId(item.stageId as number);
                }}
                className={`${editingStageId === item.stageId ? "bg-primary text-primary-content" : ""}`}
              >
                {item.moduleName || "未命名"}
              </a>
            </li>
          )) }
        </ul>
      </details>
    </div>
  );
}

export default LeftContent;
