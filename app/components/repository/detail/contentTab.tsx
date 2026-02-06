import type { Edge, Node } from "@xyflow/react";
import type { RepositoryEntityResponse } from "api/deprecated/RepositoryEntityResponse";
import { useEdgesState, useNodesState } from "@xyflow/react";
// import { useRepositoryInfoQuery } from "api/hooks/repositoryQueryHooks";
import { useState } from "react";
import { PopWindow } from "@/components/common/popWindow";
import EntityList from "@/components/repository/detail/ContentTab/entityLists";
import Roles from "@/components/repository/detail/ContentTab/roles";
import NewSceneGraph from "@/components/repository/detail/ContentTab/scene/react flow/newSceneGraph";
import EntityDetail from "./ContentTab/EntityDetail";

interface ContentTabProps {
  repositoryInfo: RepositoryEntityResponse[];
  repositoryId: number;
  isLoading: boolean;
  error: Error | null;
}

export default function ContentTab({ repositoryInfo, repositoryId, isLoading, error }: ContentTabProps) {
  const [showSceneGraph, setShowSceneGraph] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]); // 泛型是 Node
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]); // 泛型是 Edge

  return (
    <>
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">所有实体</span>
        </div>
        <div className="collapse-content bg-base-200">
          <div className="flex w-full flex-col max-w-screen md:min-h-32 bg-base-100">
            <EntityDetail repositoryInfo={repositoryInfo} />
          </div>
        </div>
      </div>

      {/* 场景 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">剧情</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList repositoryData={repositoryInfo} entityType="scene" />
          <div className="divider" />
          <div className="max-w-screen bg-base-100 relative h-[70vh] md:h-[50vh]">
            <NewSceneGraph
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              repositoryId={repositoryId}
              isLoading={isLoading}
              error={error}
            />
            <button
              type="button"
              className="btn btn-square bg-white absolute top-2 right-2 shadow-md hover:shadow-lg"
              onClick={() => setShowSceneGraph(true)}
              title="放大查看"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* 物品 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">物品</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList repositoryData={repositoryInfo} entityType="item" />
        </div>
      </div>
      {/* 地点 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">地点</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList repositoryData={repositoryInfo} entityType="location" />
        </div>
      </div>
      {/* 角色 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">角色</span>
        </div>
        <div className="collapse-content bg-base-200">
          <Roles repositoryId={repositoryId} />
        </div>
      </div>

      <PopWindow isOpen={showSceneGraph} onClose={() => setShowSceneGraph(false)} fullScreen={true}>
        <div className="md:p-8" style={{ width: "100%", height: "100%" }}>
          <NewSceneGraph
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            repositoryId={repositoryId}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </PopWindow>
    </>
  );
}
