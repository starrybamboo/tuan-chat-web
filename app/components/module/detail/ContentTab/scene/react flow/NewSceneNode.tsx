import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { PopWindow } from "../../../../../common/popWindow";
import ItemDetail from "../ItemDetail";

interface SceneNodeProps {
  data: {
    label: string;
    moduleInfo?: any;
    idx: number;
    sceneItems?: string[];
    sceneRoles?: string[];
    sceneLocations?: string[];
    description?: string;
    tip?: string;
    moduleSceneName?: string;
    children?: React.ReactNode;
  };
  selected?: boolean;
}

function SceneNode({ data, selected }: SceneNodeProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleNodeClick = () => {
    setIsPopupOpen(true);
  };

  return (
    <div className="border min-w-[120px] rounded-xs">
      {/* 右下偏移的背景层，仅作用于本内容区 */}
      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-base-300 opacity-50 rounded-xs -z-10"></div>
      <div className="border-b bg-base-100">
        {/* 节点索引显示在顶部 */}
        <span className="text-xl font-black font-mono bg-cyan-400 text-info-content">
          {(data.idx + 1).toString().padStart(2, "0")}
          .
        </span>

        <span className="ml-1 mb-2 text-sm font-semibold text-base-content">场景资源</span>
      </div>
      <div
        className={`relative cursor-pointer flex flex-col items-center justify-center h-12 ${
          selected ? "border-2 border-blue-500" : ""
        }`}
        onClick={handleNodeClick}
      >
        <div className="flex items-center justify-center">
          <span className="text-xl font-black leading-none mr-4 mb-4">「 </span>
          <span className="text-2xl font-black font-mono tracking-widest">{data.label}</span>
          <span className="text-xl font-black leading-none ml-4 mt-4"> 」</span>
        </div>
        {/* 连接点... */}
        <Handle
          type="source"
          position={Position.Right}
          className="!absolute !top-1/2"
        />
        <Handle
          type="target"
          position={Position.Left}
          className="!absolute !top-1/2"
        />
      </div>

      {/* 节点标签显示在下方 */}
      {/* <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1"
        style={{ pointerEvents: "none" }}
      >
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
          {data.label}
        </span>
      </div> */}

      {/* 场景大图弹窗 */}
      <PopWindow isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <div className="w-[50vw]">
          {
            data.children || (
              <ItemDetail
                itemName={data.label}
                itemList={[{ ...data, name: data.label, entityInfo: { description: data.description, tip: data.tip } }]}
                entityType="scene"
                moduleInfo={data.moduleInfo}
              />
            )
          }
        </div>
      </PopWindow>
    </div>
  );
}

export default SceneNode;
