import { ExtensionCategory, register } from "@antv/g6";
import { ReactNode } from "@antv/g6-extension-react";

import { Graphin } from "@antv/graphin";
import React, { useRef } from "react";

// 导入自定义组件
import { SceneNode } from "./sceneNode";

register(ExtensionCategory.NODE, "react-node", ReactNode);

export function SceneDemo() {
  const graphRef = useRef<any>(null);

  // 添加全局鼠标事件监听器来确保拖拽正确结束
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      // 清除任何可能的拖拽状态
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 如果没有按下鼠标按钮，确保没有拖拽状态
      if (e.buttons === 0) {
        document.body.style.cursor = "";
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-full">
      <div
        className="border border-gray-300 rounded-lg overflow-hidden"
        style={{
          width: "1000px", // 设置固定宽度
          height: "800px", // 设置固定高度
        }}
      >
        <Graphin
          ref={graphRef}
          id="my-graphin-demo"
          className="my-graphin-container w-full h-full"
          style={{ backgroundColor: "#ffe364ff" }}
          options={{
          // 数据
            data: {
            // 节点 数据
              nodes: [
                {
                  id: "node1",
                  scene: "教室",
                },
                {
                  id: "node2",
                  scene: "办公室",
                },
                {
                  id: "node3",
                  scene: "操场",
                },
                {
                  id: "node4",
                  scene: "天台",
                },
              ],
              // 边 数据
              edges: [
                { source: "node1", target: "node2" },
                { source: "node2", target: "node3" },
                { source: "node3", target: "node4" },
              ],
            },
            // 节点
            node: {
              type: "react-node",
              style: {
                component: (data: any) => (
                  <SceneNode
                    data={data}
                    size={[300, 150]}
                  />
                ),
              },
            },
            // 边
            edge: {
              type: "line",
              style: {
                endArrow: true,
                stroke: "#545872",
                lineWidth: 4,
                // 设置边的连接策略
                sourceAnchor: 1, // 从源节点的右边中点发出 (索引1)
                targetAnchor: 0, // 指向目标节点的左边中点 (索引0)
              },
            },
            // 布局
            layout: {
              type: "d3-force",
              link: {
                distance: 300, // 调整节点间距以适应放大效果
                strength: 2,
              },
              collide: {
                radius: 240, // 增加碰撞半径以适应放大后的节点
              },
            },
            // 交互
            behaviors: [
              "zoom-canvas",
              "drag-canvas",
              {
                type: "drag-element-force",
                enableTransient: false, // 禁用瞬态状态，避免拖拽粘连
                damping: 0.9, // 增加阻尼，让拖拽更平滑停止
                fixed: false,
              },
              "click-select",
            ],
          }}
        >
        </Graphin>
      </div>
    </div>
  );
}
