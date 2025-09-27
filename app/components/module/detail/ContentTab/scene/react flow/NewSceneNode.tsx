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
    isMobile?: boolean; // 新增移动端标识
  };
  selected?: boolean;
}

function SceneNode({ data, selected }: SceneNodeProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleNodeClick = () => {
    setIsPopupOpen(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    // 检查是否有我们关心的数据类型
    if (e.dataTransfer.types.includes("application/reactflow")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 只有当离开整个节点时才设置为false
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // 拖拽处理在MapEdit组件中已经实现
  };

  return (
    <div
      className="border min-w-[120px] rounded-xs"
      data-id={data.label}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className={`${selected ? "border-2 border-blue-500" : ""} ${
          isDragOver ? "ring-2 ring-green-400 ring-opacity-75 bg-green-50" : ""
        }`}
        onClick={handleNodeClick}
      >
        {/* 右下偏移的背景层，仅作用于本内容区 */}
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-base-300 opacity-50 rounded-xs -z-10"></div>

        {/* 场景标题 */}
        <div className="bg-base-100 p-3 text-center">
          <div className="flex items-center justify-center">
            <span className="text-xl font-black leading-none mr-2">「 </span>
            <span className="text-lg font-bold tracking-wide">{data.label}</span>
            <span className="text-xl font-black leading-none ml-2"> 」</span>
          </div>
        </div>

        {/* 场景资源信息 */}
        <div className="bg-base-50 p-2 space-y-1 text-xs">
          {/* 包含角色 */}
          {data.sceneRoles && data.sceneRoles.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600 font-medium">角色：</span>
              <div className="flex items-center gap-1">
                {data.sceneRoles.slice(0, 3).map(role => (
                  <div
                    key={role}
                    className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    title={role}
                  >
                    {role.charAt(0)}
                  </div>
                ))}
                {data.sceneRoles.length > 3 && (
                  <span className="text-gray-500 ml-1">
                    等
                    {data.sceneRoles.length}
                    个
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 包含物品 */}
          {data.sceneItems && data.sceneItems.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600 font-medium">物品：</span>
              <div className="flex items-center gap-1">
                {data.sceneItems.slice(0, 3).map(item => (
                  <div
                    key={item}
                    className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    title={item}
                  >
                    {item.charAt(0)}
                  </div>
                ))}
                {data.sceneItems.length > 3 && (
                  <span className="text-gray-500 ml-1">
                    等
                    {data.sceneItems.length}
                    个
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 所在地点 */}
          {data.sceneLocations && data.sceneLocations.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600 font-medium">在：</span>
              <div className="flex items-center gap-1 flex-wrap">
                {data.sceneLocations.slice(0, 1).map(location => (
                  <span key={location} className="text-orange-600 font-medium" title={location}>
                    {location}
                  </span>
                ))}
                {data.sceneLocations.length > 1 && (
                  <span className="text-gray-500">
                    等
                    {data.sceneLocations.length}
                    个地点
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 如果没有任何资源，显示提示 */}
          {(!data.sceneRoles || data.sceneRoles.length === 0)
            && (!data.sceneItems || data.sceneItems.length === 0)
            && (!data.sceneLocations || data.sceneLocations.length === 0) && (
            <div className="text-gray-400 text-center py-1">
              暂无场景资源
            </div>
          )}
        </div>
      </div>
      {/* 连接点... */}
      <Handle
        type="source"
        position={data.isMobile ? Position.Bottom : Position.Right}
        className={data.isMobile ? "!absolute !left-1/2" : "!absolute !top-1/2"}
      />
      <Handle
        type="target"
        position={data.isMobile ? Position.Top : Position.Left}
        className={data.isMobile ? "!absolute !left-1/2" : "!absolute !top-1/2"}
      />

      {/* 节点标签显示在下方 */}
      {/* <div
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1"        style={{ pointerEvents: "none" }}      >        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">          {data.label}        </span>      </div> */}

      {/* 场景大图弹窗 */}
      <PopWindow
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        fullScreen={data.isMobile}
      >
        <div className="w-[50vw] ">
          { data.children || (
            <ItemDetail
              itemName={data.label}
              itemList={[{ ...data, name: data.label, entityInfo: { description: data.description, tip: data.tip } }]}
              entityType="scene"
              moduleInfo={data.moduleInfo}
            />
          )}
        </div>
      </PopWindow>
    </div>
  );
}

export default SceneNode;
