import type { EdgeChange, NodeChange } from "@xyflow/react";
import type { StageEntityResponse } from "api";
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import { useCallback, useState } from "react";
import "@xyflow/react/dist/style.css";

interface mapEditProps {
  map: StageEntityResponse;
}

const initialNodes = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];
const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

export default function MapEdit({ map }: mapEditProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange<{ id: string; position: { x: number; y: number }; data: { label: string } }>[]) => setNodes(nodesSnapshot => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<{ id: string; source: string; target: string }>[]) => setEdges(edgesSnapshot => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: any) => setEdges(edgesSnapshot => addEdge(params, edgesSnapshot)),
    [],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        {map.name}
      </ReactFlow>
    </div>
  );
}