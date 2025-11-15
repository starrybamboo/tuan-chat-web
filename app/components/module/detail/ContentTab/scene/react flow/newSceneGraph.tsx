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
import { useCallback, useEffect, useMemo, useState } from "react";
// import { useParams } from "react-router";
import { getEntityListByType, mapEntitiesByVersionId } from "../../../../detail/moduleUtils";
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

  // 检测是否为移动端
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: moduleInfo } = useModuleInfoQuery(Number(moduleId!));
  // 根据sceneMap和增强场景数据生成节点和边
  const { initialNodes, initialEdges } = useMemo(() => {
    // 如果还在加载或没有数据，返回空数组
    if (!moduleInfo || isLoading) {
      return { initialNodes: [], initialEdges: [] };
    }

    // 1. rawSceneMap: 后端返回的原始场景关系图，key 是场景的 versionId，value 是该场景指向的下一批场景的 versionId 数组
    //    数据结构: Record<string, number[]>，例如 { "101": [102, 103], "102": [104] }
    //    作用: 描述场景之间的有向连接关系（剧情走向）
    const rawSceneMap = moduleInfo?.data?.moduleMap?.sceneMap || {};

    // 2. enhancedScenes: 所有场景类型的实体列表，每个元素包含 id、versionId、name、entityInfo 等完整字段
    //    作用: 提供场景的详细数据（名称、描述、包含的角色/物品/地点等），用于填充节点展示内容
    const enhancedScenes = getEntityListByType(moduleInfo, "scene");

    // 3. sceneMapByVersionId: 将场景实体按 versionId 建立索引，方便后续通过 versionId 快速查找对应实体
    //    数据结构: Record<string, StageEntityResponse>，例如 { "101": {id:1, versionId:101, name:"开场",...}, ... }
    //    作用: 从 versionId 映射到完整场景实体对象，用于获取场景名称和详情
    const sceneMapByVersionId = mapEntitiesByVersionId(enhancedScenes);

    // 4. normalizedSceneMap: 将 rawSceneMap 的 key 和 value 全部转成字符串，适配 ReactFlow 要求
    //    ReactFlow 节点/边的 id 必须是字符串类型，这里统一转换避免类型不一致导致的渲染问题
    //    数据结构: Record<string, string[]>，例如 { "101": ["102", "103"], "102": ["104"] }
    const normalizedSceneMap = Object.entries(rawSceneMap).reduce<Record<string, string[]>>(
      (acc, [source, targets]) => {
        const normalizedSource = source.toString();
        acc[normalizedSource] = (targets || []).map(target => target.toString());
        return acc;
      },
      {},
    );

    // 5. sceneIds / sceneIdList: 收集所有需要渲染的场景 versionId（字符串形式）
    //    包含两部分来源：
    //    a) normalizedSceneMap 中出现的所有 source 和 target（确保有连线关系的场景都有节点）
    //    b) enhancedScenes 中的所有场景（确保即使没有连线的孤立场景也会显示）
    //    作用: 作为节点生成的完整清单，避免遗漏任何场景
    const sceneIds = new Set<string>();
    Object.entries(normalizedSceneMap).forEach(([source, targets]) => {
      sceneIds.add(source);
      targets.forEach(target => sceneIds.add(target));
    });
    enhancedScenes.forEach((scene) => {
      if (scene.versionId !== undefined && scene.versionId !== null) {
        sceneIds.add(scene.versionId.toString());
      }
    });
    const sceneIdList = Array.from(sceneIds);

    // 6. 生成 ReactFlow 节点：遍历 sceneIdList，通过 sceneMapByVersionId 查找实体详情
    //    节点 id 使用 versionId（字符串），展示的 label 使用场景的 name 字段
    //    这样即使场景改名，versionId 不变，节点引用关系依然稳定
    const nodes: Node[] = sceneIdList.map((sceneVersionId, index) => {
      const sceneData = sceneMapByVersionId[sceneVersionId];
      const sceneName = sceneData?.name || "未命名场景";
      return {
        id: sceneVersionId,
        type: "location",
        position: { x: 0, y: 0 }, // 先占位，后续用 dagre 计算
        data: {
          moduleInfo: moduleInfo.data?.responses,
          label: sceneName,
          idx: index,
          description: sceneData?.entityInfo?.description || "",
          tip: sceneData?.entityInfo?.tip || "",
          scenelocations: sceneData?.entityInfo?.locations || [],
          sceneRoles: sceneData?.entityInfo?.roles || [],
          sceneItems: sceneData?.entityInfo?.items || [],
          moduleSceneName: sceneData?.entityInfo?.moduleSceneName || sceneName,
          isMobile, // 传递移动端标识
        },
      };
    });

    // 根据屏幕宽度动态设置分层方向
    const rankdir = isMobile ? "TB" : "LR"; // TB: 垂直分层，LR: 水平分层
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir, nodesep: 60, ranksep: 120 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // 生成边
    const edges: Edge[] = [];
    let edgeId = 1;
    Object.entries(normalizedSceneMap).forEach(([source, targets]) => {
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

    Object.entries(normalizedSceneMap).forEach(([source, targets]) => {
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
  }, [moduleInfo, isLoading, isMobile]);

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
