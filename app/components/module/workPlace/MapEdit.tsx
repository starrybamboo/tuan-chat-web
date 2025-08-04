import type { Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { StageEntityResponse } from "api";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import dagre from "dagre";
import { useCallback, useEffect, useMemo, useState } from "react";
import SceneNode from "../detail/ContentTab/scene/react flow/NewSceneNode";
import { useModuleContext } from "./context/_moduleContext";
import SceneEdit from "./SceneEdit";
import "@xyflow/react/dist/style.css";

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
  mapEditNode: SceneNode,
};

export default function MapEdit({ map }: { map: StageEntityResponse }) {
  const { stageId } = useModuleContext();
  // 接入接口
  const { data, isLoading, error } = useQueryEntitiesQuery(stageId as number);
  const { mutate: updateMap } = useUpdateEntityMutation(stageId as number);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [localMap, setLocalMap] = useState<StageEntityResponse>(map);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nodes => applyNodeChanges(changes, nodes)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(edges => applyEdgeChanges(changes, edges)),
    [],
  );

  const onConnect = useCallback(
    (params: any) => setEdges((edges) => {
      let changedMap;
      if (localMap.entityInfo?.sceneMap && localMap.entityInfo?.sceneMap[params.source]) {
        changedMap = [...localMap.entityInfo.sceneMap[params.source], params.target];
      }
      else {
        changedMap = [params.target];
      }
      const updatedMap = { ...localMap.entityInfo?.sceneMap, [params.source]: changedMap };
      updateMap({ id: localMap.id!, name: localMap.name, entityType: 5, entityInfo: { ...localMap.entityInfo, sceneMap: updatedMap } });
      setLocalMap({ id: localMap.id!, name: localMap.name, entityType: 5, entityInfo: { ...localMap.entityInfo, sceneMap: updatedMap } });
      return addEdge(params, edges);
    }),
    [],
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    const entityType3Data = data!.data!.filter(item => item.entityType === 3);
    setLocalMap(map);

    const nodes: Node[] = entityType3Data.map(item => ({
      id: item.name!,
      type: "mapEditNode",
      position: { x: 0, y: 0 },
      data: { label: item.name, idx: -1, children: <SceneEdit scene={item}></SceneEdit> },
    }));

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 120 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // 生成边
    const edges: Edge[] = [];
    let edgeId = 1;
    if (localMap.entityInfo?.sceneMap) {
      Object.entries(localMap.entityInfo?.sceneMap).forEach(([source, targets]) => {
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
    }

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
      const pos = dagreGraph.node(node.id);
      if (pos) {
        node.position = {
          x: pos.x - 100,
          y: pos.y - 60,
        };
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [data, isLoading, localMap]);

  useEffect(() => {
    if (nodes.length === 0 && initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (edges.length === 0 && initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, nodes, edges, setNodes, setEdges, map]);

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
          {String(error)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodeOrigin={[0.5, 0]}
      >
        <AutoFitView nodes={nodes} edges={edges} />
        <Controls />
        <Background gap={16} color="#aaa" />
        {map.name}
      </ReactFlow>
    </div>
  );
}
