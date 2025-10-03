/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { Connection, Edge, EdgeChange, Node, NodeChange } from "@xyflow/react";
import type { StageEntityResponse } from "api";
import SceneNode from "@/components/module/detail/ContentTab/scene/react flow/NewSceneNode";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  reconnectEdge,
} from "@xyflow/react";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import dagre from "dagre";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";
import SceneEdit from "./SceneEdit";
import "@xyflow/react/dist/style.css";

const nodeTypes = {
  mapEditNode: SceneNode,
};

export default function MapEdit({ map }: { map: StageEntityResponse; onRegisterSave?: (fn: () => void) => void }) {
  const { stageId } = useModuleContext();
  // 接入接口
  const { data, isLoading, error } = useQueryEntitiesQuery(stageId as number);
  const { mutate: updateMap } = useUpdateEntityMutation(stageId as number);

  // reactflow绘制
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [sceneMap, setSceneMap] = useState<Record<string, string[]>>(map.entityInfo?.sceneMap || {});
  const initialized = useRef(false);

  // 检测是否为移动端，用于决定布局方向（与 newSceneGraph 保持一致）
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 768 : false;
  });
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // 处理从外部拖拽到节点上的功能
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const reactFlowData = event.dataTransfer.getData("application/reactflow");
    if (!reactFlowData)
      return;

    try {
      const draggedItem = JSON.parse(reactFlowData);
      const dropTarget = event.target as HTMLElement;

      // 查找最近的场景节点
      const sceneNode = dropTarget.closest("[data-id]");
      if (!sceneNode)
        return;

      const sceneId = sceneNode.getAttribute("data-id");
      if (!sceneId)
        return;

      // 查找对应的场景数据
      const sceneData = data?.data?.find(item =>
        item.entityType === 3 && item.name === sceneId,
      );

      if (!sceneData)
        return;

      // 更新场景数据
      const currentEntityInfo = sceneData.entityInfo || {};
      const updatedEntityInfo = { ...currentEntityInfo };
      let wasAdded = false;
      let alreadyExists = false;

      switch (draggedItem.type) {
        case "item": {
          const currentItems = updatedEntityInfo.items || [];
          if (!currentItems.includes(draggedItem.name)) {
            updatedEntityInfo.items = [...currentItems, draggedItem.name];
            wasAdded = true;
          }
          else {
            alreadyExists = true;
          }
          break;
        }
        case "role": {
          const currentRoles = updatedEntityInfo.roles || [];
          if (!currentRoles.includes(draggedItem.name)) {
            updatedEntityInfo.roles = [...currentRoles, draggedItem.name];
            wasAdded = true;
          }
          else {
            alreadyExists = true;
          }
          break;
        }
        case "location": {
          const currentLocations = updatedEntityInfo.locations || [];
          if (!currentLocations.includes(draggedItem.name)) {
            updatedEntityInfo.locations = [...currentLocations, draggedItem.name];
            wasAdded = true;
          }
          else {
            alreadyExists = true;
          }
          break;
        }
      }

      const typeText = draggedItem.type === "item"
        ? "物品"
        : draggedItem.type === "role" ? "角色" : "地点";

      if (alreadyExists) {
        toast.error(`${typeText}「${draggedItem.name}」已存在于场景「${sceneData.name}」中`);
        return;
      }

      if (wasAdded) {
        // 调用API更新场景
        updateMap({
          id: sceneData.id!,
          name: sceneData.name!,
          entityType: 3,
          entityInfo: updatedEntityInfo,
        });

        // 显示成功提示
        toast.success(`已将${typeText}「${draggedItem.name}」添加到场景「${sceneData.name}」`);
      }
    }
    catch (error) {
      console.error("Error handling drop:", error);
      toast.error("拖拽添加失败，请重试");
    }
  }, [data, updateMap]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // 仅为新增节点计算一个合理位置（使用 dagre），不改变已存在节点的位置
  const computePositionForNewNode = useCallback((
    nodeId: string,
    baseNodes: Node[],
    currentSceneMap: Record<string, string[]>,
  ): { x: number; y: number } => {
    const NODE_WIDTH = 200;
    const NODE_HEIGHT = 120;
    const OFFSET_X = NODE_WIDTH / 2;
    const OFFSET_Y = NODE_HEIGHT / 2;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    const rankdir = isMobile ? "TB" : "LR";
    g.setGraph({ rankdir, nodesep: 60, ranksep: 120 });

    // 现有节点 + 新节点
    baseNodes.forEach((n) => {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });
    g.setNode(nodeId, { width: NODE_WIDTH, height: NODE_HEIGHT });

    // sceneMap 边
    Object.entries(currentSceneMap || {}).forEach(([source, targets]) => {
      (targets || []).forEach((target: string) => {
        g.setEdge(source, target);
      });
    });

    try {
      dagre.layout(g);
      const pos = g.node(nodeId);
      if (pos) {
        return { x: pos.x - OFFSET_X, y: pos.y - OFFSET_Y };
      }
    }
    catch {
      // ignore dagre failures; fallback below
    }

    // Fallback：按当前已有节点的边界进行简单摆放
    if (baseNodes.length > 0) {
      const xs = baseNodes.map(n => n.position.x);
      const ys = baseNodes.map(n => n.position.y);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
      const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (isMobile) {
        // 竖直布局：放到最下方一行
        return { x: avgX, y: maxY + NODE_HEIGHT + 60 };
      }
      // 水平布局：放在最右侧一列
      return { x: maxX + NODE_WIDTH + 60, y: avgY };
    }
    // 没有任何节点时，置于原点附近
    return { x: 0, y: 0 };
  }, [isMobile]);

  // 初始化节点 + 初始布局（引入 dagre 布局，并根据地图的 sceneMap 设置边）
  useEffect(() => {
    if (!data?.data || initialized.current)
      return;

    const entityType3Data = data.data.filter(item => item.entityType === 3);

    const newNodes: Node[] = entityType3Data.map(item => ({
      id: item.name!,
      type: "mapEditNode",
      position: { x: 0, y: 0 },
      data: {
        label: item.name,
        idx: -1,
        children: <SceneEdit scene={item} id={item.id!}></SceneEdit>,
        // 添加场景资源信息
        sceneItems: item.entityInfo?.items || [],
        sceneRoles: item.entityInfo?.roles || [],
        sceneLocations: item.entityInfo?.locations || [],
        description: item.entityInfo?.description || "",
        tip: item.entityInfo?.tip || "",
        isMobile,
      },
    }));

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const rankdir = isMobile ? "TB" : "LR";
    dagreGraph.setGraph({ rankdir, nodesep: 60, ranksep: 120 });

    newNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // 从数据中读取当前地图的 sceneMap，并转换为 dagre 的边
    const mapEntity = data.data.find(item => item.entityType === 5);
    const mapSceneMap: Record<string, string[]> = mapEntity?.entityInfo?.sceneMap || {};
    Object.entries(mapSceneMap).forEach(([source, targets]) => {
      (targets || []).forEach((target: string) => {
        dagreGraph.setEdge(source, target);
      });
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
  }, [data, isMobile]);

  // 根据 sceneMap 更新边
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

  // 取消边变化后的自动重布局，保留初始化时的布局即可（避免操作时跳动）

  // 用于节点改名时的变化
  useEffect(() => {
    if (!data?.data || !initialized.current)
      return;

    const entityType3Data = data.data.filter(item => item.entityType === 3);
    const mapEntity = data.data.find(item => item.entityType === 5);
    const currentSceneMap: Record<string, string[]> = mapEntity?.entityInfo?.sceneMap || {};

    setNodes((prevNodes) => {
      const accNodes: Node[] = [...prevNodes];
      const built: Node[] = entityType3Data.map((item) => {
        const existingNode = accNodes.find(node => node.id === item.name);
        if (existingNode) {
          const node: Node = {
            id: item.name!,
            type: "mapEditNode",
            position: existingNode.position,
            data: {
              label: item.name,
              idx: -1,
              children: <SceneEdit scene={item} id={item.id!}></SceneEdit>,
              // 更新场景资源信息
              sceneItems: item.entityInfo?.items || [],
              sceneRoles: item.entityInfo?.roles || [],
              sceneLocations: item.entityInfo?.locations || [],
              description: item.entityInfo?.description || "",
              tip: item.entityInfo?.tip || "",
              isMobile,
            },
          };
          // 同步到累积集合，以便后续新节点计算参考
          const idx = accNodes.findIndex(n => n.id === node.id);
          if (idx >= 0) {
            accNodes[idx] = node;
          }
          else {
            accNodes.push(node);
          }
          return node;
        }
        // 新增节点：计算一个合适的位置
        const pos = computePositionForNewNode(item.name!, accNodes, currentSceneMap);
        const node: Node = {
          id: item.name!,
          type: "mapEditNode",
          position: pos,
          data: {
            label: item.name,
            idx: -1,
            children: <SceneEdit scene={item} id={item.id!}></SceneEdit>,
            // 添加场景资源信息
            sceneItems: item.entityInfo?.items || [],
            sceneRoles: item.entityInfo?.roles || [],
            sceneLocations: item.entityInfo?.locations || [],
            description: item.entityInfo?.description || "",
            tip: item.entityInfo?.tip || "",
            isMobile,
          },
        };
        accNodes.push(node);
        return node;
      });
      return built;
    });
  }, [data, computePositionForNewNode, isMobile]);

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
    <div className="w-full h-[75vh]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onEdgesReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodeOrigin={[0.5, 0]}
      >
        <Controls />
        <Background gap={16} color="#aaa" />
        {map.name}
      </ReactFlow>
    </div>
  );
}
