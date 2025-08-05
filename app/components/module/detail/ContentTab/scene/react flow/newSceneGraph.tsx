import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
// import { useModuleInfoQuery } from "api/hooks/moduleQueryHooks";
import dagre from "dagre";
import { useCallback, useEffect, useMemo } from "react";
// import { useParams } from "react-router";
import { getEnhancedSceneList } from "../../../../detail/moduleUtils";
import SceneNode from "./NewSceneNode";
import "@xyflow/react/dist/style.css";

interface NewSceneGraphProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  moduleId: number;
  isLoading: boolean;
  error: any;
}

// 自动 fitView 组件，必须作为 ReactFlow 的子组件
function AutoFitView({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (nodes.length > 0) {
      fitView();
    }
  }, [nodes, edges, fitView]);
  return null;
}

const nodeTypes = {
  location: SceneNode,
};

export default function NewSceneGraph(props: NewSceneGraphProps) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    moduleId,
    isLoading,
    error,
  } = props;

  const { data: moduleInfo } = useModuleInfoQuery(Number(moduleId!));
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
          moduleInfo: moduleInfo.data?.responses,
          label: sceneName,
          idx: scenes.indexOf(sceneName),
          sceneItems: sceneData?.sceneItems || [],
          sceneRoles: sceneData?.sceneRoles || [],
          sceneLocations: sceneData?.sceneLocations || [],
          description: sceneData?.entityInfo?.description || "",
          tip: sceneData?.entityInfo?.tip || "",
          moduleSceneName: sceneData?.entityInfo?.moduleSceneName || sceneName,
        },
      };
    });

    // 根据屏幕宽度动态设置分层方向
    const isSmallScreen = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const rankdir = isSmallScreen ? "TB" : "LR"; // TB: 垂直分层，LR: 水平分层
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir, nodesep: 60, ranksep: 120 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // 生成边
    const edges: Edge[] = [];
    let edgeId = 1;
    Object.entries(sceneMap).forEach(([source, targets]) => {
      (targets as string[]).forEach((target: string) => {
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
      (targets as string[]).forEach((target: string) => {
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

  // const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  // const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 自动 fitView 逻辑已移到 AutoFitView 组件

  // 当 initialNodes 或 initialEdges 变化时，更新状态
  useEffect(() => {
    if (nodes.length === 0 && initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (edges.length === 0 && initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, nodes, edges, setNodes, setEdges]);

  const onNodeDrag = useCallback((_event: any, _node: Node) => {
    // Node dragged
  }, []);

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
      <AutoFitView nodes={nodes} edges={edges} />
      <Controls />
      <Background gap={16} color="#aaa" />
    </ReactFlow>
  );
}
