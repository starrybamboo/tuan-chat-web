import { Handle, Position } from "@xyflow/react";
import { useLayoutEffect, useRef, useState } from "react";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import ItemDetail from "../ItemDetail";

interface SceneNodeProps {
  data: {
    label: string;
    idx: number;
    description?: string;
    tip?: string;
    image?: string;
    moduleSceneName?: string;
    children?: React.ReactNode;
    isMobile?: boolean;
  };
  selected?: boolean;
}

function SceneNode({ data, selected }: SceneNodeProps) {
  const NODE_WIDTH_CLASS = "w-[200px]";
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
      <div ref={titleRef} className={`relative bg-transparent text-center p-2 ${NODE_WIDTH_CLASS}`}>
        <div className="flex items-center justify-center text-base-content">
          <span className="text-lg font-black leading-none mr-2">「 </span>
          <span className="max-w-[9rem] truncate text-base font-bold tracking-wide" title={data.label}>{data.label}</span>
          <span className="text-lg font-black leading-none ml-2"> 」</span>
        </div>
      </div>
      <div
        className={NODE_WIDTH_CLASS}
        data-id={data.label}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`relative overflow-hidden rounded-sm bg-base-100 ${
            selected
              ? "border-2 border-primary"
              : "border border-base-content"
          } ${isDragOver ? "ring-2 ring-green-400 ring-opacity-75" : ""}`}
          onClick={handleNodeClick}
        >
          {/* 右下偏移的背景层，仅作用于本内容区 */}
          <div className="absolute inset-0 translate-x-1 translate-y-1 bg-base-300/40 rounded-sm -z-10"></div>

          <div className="relative h-20 w-full border-b border-base-300/70">
            <img
              src={data.image || "/repositoryDefaultImage.webp"}
              alt={data.label}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 图片加载失败时使用默认图片
                (e.currentTarget as HTMLImageElement).src = "/repositoryDefaultImage.webp";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent"></div>
          </div>

          <div className="relative h-20 bg-base-100 p-2 text-xs text-base-content/80 leading-5">
            {data.description?.trim()
              ? (
                  <p className="max-h-full overflow-hidden break-words whitespace-pre-wrap" title={data.description}>
                    {data.description}
                  </p>
                )
              : (
                  <div className="text-base-content/60 text-center py-1">暂无描述</div>
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
        <ToastWindow
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          fullScreen={data.isMobile}
        >
          <div className="w-[50vw] ">
            { data.children || (
              <ItemDetail
                itemName={data.label}
                itemList={[{ ...data, name: data.label, entityInfo: { description: data.description, tip: data.tip } }]}
              />
            )}
          </div>
        </ToastWindow>
      </div>
    </>
  );
}

export default SceneNode;
