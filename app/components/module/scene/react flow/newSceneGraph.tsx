import type { Edge, Node } from "@xyflow/react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import dagre from "dagre";
import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { getEnhancedSceneList } from "../../detail/moduleUtils";
import SceneNode from "./NewSceneNode";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  location: SceneNode,
};

export default function NewSceneGraph() {
  const params = useParams();
  const moduleId = Number(params.id);

  // 获取模组信息
  const { data: moduleInfo, isLoading, error } = useModuleInfoQuery(moduleId);

  // 根据sceneMap和增强场景数据生成节点和边
  const { initialNodes, initialEdges } = useMemo(() => {
    // 如果还在加载或没有数据，返回空数组
    if (!moduleInfo || isLoading) {
      return { initialNodes: [], initialEdges: [] };
    }

    const sceneMap = moduleInfo?.data?.moduleMap?.sceneMap || {};
    const enhancedScenes = getEnhancedSceneList(moduleInfo);
    const scenes = Object.keys(sceneMap);

    // 生成节点（先不设置 position）
    const nodes: Node[] = scenes.map((sceneName) => {
      const sceneData = enhancedScenes.find(scene => scene.name === sceneName);
      return {
        id: sceneName,
        type: "location",
        position: { x: 0, y: 0 }, // 先占位，后续用 dagre 计算
        data: {
          label: sceneName,
          imgUrl: sceneData?.entityInfo?.image || `/app/components/module/scene/images/教室.webp`,
          sceneItems: sceneData?.sceneItems || [],
          sceneRoles: sceneData?.sceneRoles || [],
          description: sceneData?.entityInfo?.sceneDescription || "",
          tip: sceneData?.entityInfo?.tip || "",
          moduleSceneId: sceneData?.entityInfo?.moduleSceneId || 0,
          moduleSceneName: sceneData?.entityInfo?.moduleSceneName || sceneName,
          createTime: sceneData?.entityInfo?.createTime || "",
          updateTime: sceneData?.entityInfo?.updateTime || "",
        },
      };
    });

    // 使用 dagre 进行分层布局
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 }); // LR: 水平分层

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // 生成边
    const edges: Edge[] = [];
    let edgeId = 1;
    Object.entries(sceneMap).forEach(([source, targets]) => {
      targets.forEach((target) => {
        dagreGraph.setEdge(source, target);
        edges.push({
          id: `e${edgeId++}`,
          source,
          target,
          animated: true,
          type: "smoothstep",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#333",
          },
          style: {
            strokeWidth: 2,
          },
        });
      });
    });

    dagre.layout(dagreGraph);

    // 更新节点 position
    nodes.forEach((node) => {
      const pos = dagreGraph.node(node.id);
      if (pos) {
        node.position = {
          x: pos.x - 100, // 居中
          y: pos.y - 60,
        };
      }
    });

    const simpleEdges: { source: string; target: string }[] = [];

    Object.entries(sceneMap).forEach(([source, targets]) => {
      targets.forEach((target) => {
        simpleEdges.push({ source, target });
        edges.push({
          id: `e${edgeId++}`,
          source,
          target,
          animated: true,
          type: "smoothstep", // 使用平滑步进边，减少重叠
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: "#333",
          },
          style: {
            strokeWidth: 2,
          },
        });
      });
    });

    // 应用布局算法
    return { initialNodes: nodes, initialEdges: edges };
  }, [moduleInfo, isLoading]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 当 initialNodes 或 initialEdges 变化时，更新状态
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeDrag = useCallback((_event: any, _node: Node) => {
    // Node dragged
  }, []);

  // 添加成功生成节点时的调试信息
  if (nodes.length > 0 && !isLoading) {
    console.warn("✅ Nodes generated successfully:", {
      nodesCount: nodes.length,
      edgesCount: edges.length,
      firstNode: nodes[0],
    });
  }

  // 添加加载和错误状态处理
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div>
          加载错误:
          {" "}
          {String(error)}
        </div>
      </div>
    );
  }

  if (!moduleInfo) {
    return (
      <div style={{ height: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>没有模组数据</div>
      </div>
    );
  }

  return (
    <div style={{ height: "50vh" }}>
      <ReactFlow
        key={`reactflow-${nodes.length}-${edges.length}`}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodeOrigin={[0.5, 0]}
      >
        <Controls />
        <Background gap={16} color="#aaa" />
      </ReactFlow>
    </div>
  );
}
