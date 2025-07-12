import React from "react";

// 导入图片
import 办公室 from "../images/办公室.jpg";
import 天台 from "../images/天台.jpg";
import 操场 from "../images/操场.jpg";
import 教室 from "../images/教室.jpg";

// 自定义React节点组件接口
export interface SceneNodeProps {
  data: {
    id: string;
    scene: string;
    states?: string[]; // 添加状态属性
  };
  size: [number, number];
}

export const SceneNode: React.FC<SceneNodeProps> = ({ data, size }) => {
  const imageMap: Record<string, string> = {
    node1: 教室,
    node2: 办公室,
    node3: 操场,
    node4: 天台,
  };

  const imageSrc = imageMap[data.id] || 教室;

  // 检查节点状态
  const isSelected = data.states?.includes("selected");

  // 禁用默认的拖拽和选择行为
  const handlePreventDefault = (e: React.DragEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理鼠标事件以确保拖拽正确结束
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 确保鼠标抬起时结束任何拖拽状态
    document.body.style.cursor = "";
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`scene-node flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300 ease-in-out select-none overflow-hidden bg-white rounded-lg border-4 ${
        isSelected
          ? "border-blue-500 shadow-blue-500/50"
          : "border-gray-300"
      }`}
      style={{
        width: size[0],
        height: size[1],
        touchAction: "none",
        // 选中时放大效果
        transform: `scale(${isSelected ? 1.05 : 1})`,
        boxShadow: isSelected
          ? "0 0 16px rgba(71, 89, 255, 0.8)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
        zIndex: isSelected ? 5 : 1,
      }}
      // 禁用拖拽相关事件
      onDragStart={handlePreventDefault}
      onDrop={handlePreventDefault}
      onDragOver={handlePreventDefault}
      onDragEnd={handlePreventDefault}
      // 添加鼠标事件处理
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={imageSrc}
        alt={data.scene}
        className="w-full h-full object-cover select-none pointer-events-none"
        // 禁用图片拖拽
        draggable={false}
        onDragStart={handlePreventDefault}
        onContextMenu={handlePreventDefault} // 禁用右键菜单
      />
      {/* 悬浮的场景名称，带有渐变遮罩 */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* 白色渐变遮罩 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 70%, transparent 100%)",
          }}
        />
        {/* 场景名称文字 */}
        <div className="relative z-10 flex items-center justify-center text-xl font-bold text-gray-800 select-none py-1">
          {data.scene}
        </div>
      </div>
    </div>
  );
};
