/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { StageEntityResponse } from "api";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  reconnectEdge,
  useReactFlow,
} from "@xyflow/react";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import dagre from "dagre";
import { useCallback, useEffect, useRef, useState } from "react";
import SceneNode from "../../detail/ContentTab/scene/react flow/NewSceneNode";
import { useModuleContext } from "../context/_moduleContext";
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

  // reactflow绘制
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sceneMap, setSceneMap] = useState<Record<string, string[]>>(map.entityInfo?.sceneMap || {});
  const initialized = useRef(false);

  // reactflow移除边
  const edgeReconnectSuccessful = useRef(true);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nodes => applyNodeChanges(changes, nodes)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // 检查是否有边被移除
      const removedEdges = changes.filter(change =>
        change.type === "remove" && "id" in change,
      ) as Array<{ id: string; type: "remove" }>;

      // 如果有边被移除，更新sceneMap
      if (removedEdges.length > 0) {
        setSceneMap((prevSceneMap) => {
          const updatedSceneMap = { ...prevSceneMap };

          // 从updatedSceneMap中移除对应的边
          removedEdges.forEach((removedEdge) => {
            const edge = edges.find(e => e.id === removedEdge.id);
            if (edge) {
              if (updatedSceneMap[edge.source]) {
                updatedSceneMap[edge.source] = updatedSceneMap[edge.source].filter(
                  (target: string) => target !== edge.target,
                );

                // 如果source没有目标了，删除这个source键
                if (updatedSceneMap[edge.source].length === 0) {
                  delete updatedSceneMap[edge.source];
                }
              }
            }
          });

          // 调用API更新
          updateMap({
            id: map.id!,
            name: map.name,
            entityType: 5,
            entityInfo: {
              ...map.entityInfo,
              sceneMap: updatedSceneMap,
            },
          });

          return updatedSceneMap;
        });
      }

      setEdges(eds => applyEdgeChanges(changes, eds));
    },
    [edges, map, updateMap],
  );

  // 添加边
  const onConnect = useCallback(
    (params: Connection) => {
      setSceneMap((prevSceneMap) => {
        let changedMap;
        if (prevSceneMap[params.source!]) {
          changedMap = [...prevSceneMap[params.source!], params.target!];
        }
        else {
          changedMap = [params.target!];
        }
        const updatedSceneMap = { ...prevSceneMap, [params.source!]: changedMap };

        // 调用API更新
        updateMap({
          id: map.id!,
          name: map.name,
          entityType: 5,
          entityInfo: {
            ...map.entityInfo,
            sceneMap: updatedSceneMap,
          },
        });

        return updatedSceneMap;
      });

      setEdges(eds => addEdge(params, eds));
    },
    [map, updateMap],
  );

  // 移除和重新连接边
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnectEnd = useCallback((_: any, edge: Edge) => {
    if (!edgeReconnectSuccessful.current) {
      setSceneMap((prevSceneMap) => {
        const updatedSceneMap = { ...prevSceneMap };
        if (updatedSceneMap[edge.source]) {
          updatedSceneMap[edge.source] = updatedSceneMap[edge.source].filter(
            (target: string) => target !== edge.target,
          );

          // 如果source没有目标了，删除这个source键
          if (updatedSceneMap[edge.source].length === 0) {
            delete updatedSceneMap[edge.source];
          }
        }

        // 调用API更新
        updateMap({
          id: map.id!,
          name: map.name,
          entityType: 5,
          entityInfo: {
            ...map.entityInfo,
            sceneMap: updatedSceneMap,
          },
        });

        return updatedSceneMap;
      });
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    }

    edgeReconnectSuccessful.current = true;
  }, [map, updateMap]);

  // 处理重连操作
  const onEdgesReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setSceneMap((prevSceneMap) => {
      // 先从旧的连接中移除边
      const updatedSceneMap = { ...prevSceneMap };
      if (updatedSceneMap[oldEdge.source]) {
        updatedSceneMap[oldEdge.source] = updatedSceneMap[oldEdge.source].filter(
          (target: string) => target !== oldEdge.target,
        );

        // 如果source没有目标了，删除这个source键
        if (updatedSceneMap[oldEdge.source].length === 0) {
          delete updatedSceneMap[oldEdge.source];
        }
      }

      // 再添加新的连接
      let changedMap;
      if (updatedSceneMap[newConnection.source!]) {
        changedMap = [...updatedSceneMap[newConnection.source!], newConnection.target!];
      }
      else {
        changedMap = [newConnection.target!];
      }
      updatedSceneMap[newConnection.source!] = changedMap;

      // 调用API更新
      updateMap({
        id: map.id!,
        name: map.name,
        entityType: 5,
        entityInfo: {
          ...map.entityInfo,
          sceneMap: updatedSceneMap,
        },
      });

      return updatedSceneMap;
    });

    setEdges(els => reconnectEdge(oldEdge, newConnection, els));
  }, [map, updateMap]);

  // 初始化节点
  useEffect(() => {
    if (!data?.data || initialized.current)
      return;

    const entityType3Data = data.data.filter(item => item.entityType === 3);

    const newNodes: Node[] = entityType3Data.map(item => ({
      id: item.name!,
      type: "mapEditNode",
      position: { x: 0, y: 0 },
      data: { label: item.name, idx: -1, children: <SceneEdit scene={item}></SceneEdit> },
    }));

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 120 });

    newNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    dagre.layout(dagreGraph);

    newNodes.forEach((node) => {
      const pos = dagreGraph.node(node.id);
      if (pos) {
        node.position = {
          x: pos.x - 100,
          y: pos.y - 60,
        };
      }
    });

    setNodes(newNodes);
    initialized.current = true;
  }, [data]);

  // 根据sceneMap更新边
  useEffect(() => {
    if (!initialized.current)
      return;
    setSceneMap(data?.data?.filter(item => item.entityType === 5)[0].entityInfo?.sceneMap);

    const newEdges: Edge[] = [];
    let edgeId = 1;

    Object.entries(sceneMap).forEach(([source, targets]) => {
      targets.forEach((target: string) => {
        newEdges.push({
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

    setEdges(newEdges);
  }, [data, sceneMap]);

  // 用于节点改名时的变化
  useEffect(() => {
    if (!data?.data || !initialized.current)
      return;

    const entityType3Data = data.data.filter(item => item.entityType === 3);

    setNodes((prevNodes) => {
      const newNodes: Node[] = entityType3Data.map((item) => {
        // 查找是否已有这个节点（通过ID匹配）
        const existingNode = prevNodes.find(node => node.id === item.name);
        return {
          id: item.name!,
          type: "mapEditNode",
          position: existingNode ? existingNode.position : { x: 0, y: 0 },
          data: { label: item.name, idx: -1, children: <SceneEdit scene={item}></SceneEdit> },
        };
      });
      return newNodes;
    });
  }, [data]);

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
        onReconnect={onEdgesReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
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
