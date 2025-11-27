import { Handle, Position } from "@xyflow/react";
import { useLayoutEffect, useRef, useState } from "react";
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
    image?: string; // 新增图片字段
    moduleSceneName?: string;
    children?: React.ReactNode;
    isMobile?: boolean; // 新增移动端标识
  };
  selected?: boolean;
}

function SceneNode({ data, selected }: SceneNodeProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleHeight, setTitleHeight] = useState(0);

  useLayoutEffect(() => {
    if (titleRef.current) {
      setTitleHeight(titleRef.current.offsetHeight);
    }
  }, [data.label, data.isMobile]);

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

  // 统一放大 Handle 的点击热区：视觉 18x18，可通过 after 伪元素再扩 10px（需 Tailwind 支持）
  const enlargedHandleStyle: React.CSSProperties = {
    width: 18,
    height: 18,
    minWidth: 18,
    minHeight: 18,
    borderWidth: 2,
    backgroundColor: "#3b25c1",
    borderColor: "#ffffff",
  };

  return (
    <>
      {/* 场景标题 */}
      <div ref={titleRef} className="relative bg-transparent text-center p-2">
        <div className="flex items-center justify-center text-base-content">
          <span className="text-lg font-black leading-none mr-2">「 </span>
          <span className="text-base font-bold tracking-wide">{data.label}</span>
          <span className="text-lg font-black leading-none ml-2"> 」</span>
        </div>
      </div>
      <div
        className="min-w-[120px]"
        data-id={data.label}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`relative rounded-md ${selected ? "border-2 border-primary" : "border border-base-content"} ${
            isDragOver ? "ring-2 ring-green-400 ring-opacity-75" : ""
          }`}
          onClick={handleNodeClick}
        >
          {/* 背景图片（覆盖整个节点，降低透明度） */}
          <div className="absolute inset-0 -z-[1] opacity-80">
            <img
              src={data.image || "/moduleDefaultImage.webp"}
              alt={data.label}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 图片加载失败时使用默认图片
                (e.currentTarget as HTMLImageElement).src = "/moduleDefaultImage.webp";
              }}
            />
          </div>

          {/* 右下偏移的背景层，仅作用于本内容区 */}
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-base-300 opacity-50 rounded-md -z-10"></div>

          {/* 场景资源信息 */}
          <div className="relative h-20 bg-base-50 p-2 space-y-1 text-xs">
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
              <div className="text-gray-600 text-center py-1">
                暂无场景资源
              </div>
            )}
          </div>
        </div>
        {/* 连接点... */}
        <Handle
          type="source"
          position={data.isMobile ? Position.Bottom : Position.Right}
          style={{
            ...enlargedHandleStyle,
            top: data.isMobile ? undefined : `calc(50% + ${titleHeight / 2}px)`,
          }}
          className={`${data.isMobile ? "!absolute !left-1/2" : "!absolute"} !w-[18px] !h-[18px] before:content-[''] before:absolute before:inset-[-5px] before:block before:w-[28px] before:h-[28px] before:rounded-full before:bg-transparent`}
        />
        <Handle
          type="target"
          position={data.isMobile ? Position.Top : Position.Left}
          style={{
            ...enlargedHandleStyle,
            top: data.isMobile ? undefined : `calc(50% + ${titleHeight / 2}px)`,
          }}
          className={`${data.isMobile ? "!absolute !left-1/2" : "!absolute"} !w-[18px] !h-[18px] before:content-[''] before:absolute before:inset-[-5px] before:block before:w-[28px] before:h-[28px] before:rounded-full before:bg-transparent`}
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
    </>
  );
}

export default SceneNode;
