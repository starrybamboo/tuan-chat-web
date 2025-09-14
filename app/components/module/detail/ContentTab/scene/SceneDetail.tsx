import React from "react";

interface SceneDetailProps {
  data: {
    label: string;
    idx: number;
    sceneItems?: string[];
    sceneRoles?: string[];
    sceneLocations?: string[];
    description?: string;
    tip?: string;
    moduleSceneName?: string;
  };
}

const SceneDetail: React.FC<SceneDetailProps> = ({ data }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl">
      <h3 className="text-xl font-bold text-center">{data.label}</h3>
      {/* 模组场景信息 */}
      <div className="w-full bg-gray-50 p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {data.moduleSceneName && (
            <div>
              <span className="font-medium text-gray-600">剧情名称: </span>
              <span className="text-gray-800">{data.moduleSceneName}</span>
            </div>
          )}
        </div>
      </div>

      {/* 场景描述 */}
      {data.description && (
        <div className="w-full">
          <h4 className="font-semibold text-lg mb-2">剧情描述</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
            {data.description}
          </p>
        </div>
      )}

      {/* KP提示 */}
      {data.tip && (
        <div className="w-full">
          <h4 className="font-semibold text-lg mb-2 text-orange-600">剧情详细</h4>
          <p className="text-gray-700 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-200">
            {data.tip}
          </p>
        </div>
      )}

      {/* 场景物品 */}
      {data.sceneItems && data.sceneItems.length > 0 && (
        <div className="w-full">
          <h4 className="font-semibold text-lg mb-2 text-green-600">场景物品</h4>
          <div className="flex flex-wrap gap-2">
            {data.sceneItems.map((item: string) => (
              <span
                key={item}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 场景角色 */}
      {data.sceneRoles && data.sceneRoles.length > 0 && (
        <div className="w-full">
          <h4 className="font-semibold text-lg mb-2 text-blue-600">场景角色</h4>
          <div className="flex flex-wrap gap-2">
            {data.sceneRoles.map((role: string) => (
              <span
                key={role}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 场景地点 */}
      {data.sceneLocations && data.sceneLocations.length > 0 && (
        <div className="w-full">
          <h4 className="font-semibold text-lg mb-2 text-purple-600">场景地点</h4>
          <div className="flex flex-wrap gap-2">
            {data.sceneLocations.map((location: string) => (
              <span
                key={location}
                className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {location}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneDetail;
