import EntityList from "@/components/module/detail/ContentTab/entityLists";
import Roles from "@/components/module/detail/ContentTab/roles";
import NewSceneGraph from "@/components/module/detail/ContentTab/scene/react flow/newSceneGraph";

interface ContentTabProps {
  moduleId: number;
}

export default function ContentTab({ moduleId }: ContentTabProps) {
  return (
    <>
      {/* 场景 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-primary align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">场景</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList moduleId={moduleId} entityType="scene" />
          <div className="divider" />
          <NewSceneGraph />
        </div>
      </div>
      {/* 物品 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-primary align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">物品</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList moduleId={moduleId} entityType="item" />
        </div>
      </div>
      {/* 地点 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-primary align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">地点</span>
        </div>
        <div className="collapse-content bg-base-200">
          <EntityList moduleId={moduleId} entityType="location" />
        </div>
      </div>
      {/* 角色 */}
      <div className="collapse collapse-arrow bg-base-300 mb-2">
        <input type="checkbox" className="peer" defaultChecked />
        <div className="collapse-title peer-checked:bg-base-200 text-lg font-bold flex items-center gap-2">
          <span className="flex items-center h-7">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-primary align-middle"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12V6.75A2.25 2.25 0 014.5 4.5h3.379c.414 0 .81.17 1.102.474l1.197 1.252c.292.304.688.474 1.102.474H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 19.5V12z" />
            </svg>
          </span>
          <span className="leading-none">角色</span>
        </div>
        <div className="collapse-content bg-base-200">
          <Roles moduleId={moduleId} />
        </div>
      </div>
    </>
  );
}
