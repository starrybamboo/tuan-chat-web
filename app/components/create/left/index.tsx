import { useModuleContext } from "@/components/module/workPlace/ModuleContext";
import History from "./history";
import ModuleItems from "./moduleItems";
import Stages from "./stages";

// interface LeftContentProps {
//   onChange?: (s: string) => void;
// }
function LeftContent() {
  const { setModulePartition } = useModuleContext();

  return (
    <div className="tabs tabs-lift h-full">
      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="内容"
        onClick={
          () => {
            setModulePartition("content");
          }
        }
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full">
        <ModuleItems />
      </div>

      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="暂存区"
        defaultChecked
        onClick={
          () => {
            setModulePartition("StagingArea");
          }
        }
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full rounded-none">
        <Stages />
      </div>

      <input
        type="radio"
        name="left-tabs"
        className="tab min-w-18!"
        aria-label="历史"
        onClick={
          () => {
            setModulePartition("history");
          }
        }
      />
      <div className="tab-content bg-base-100 border-base-300 min-h-full">
        <History />
      </div>
    </div>
  );
}

export default LeftContent;
