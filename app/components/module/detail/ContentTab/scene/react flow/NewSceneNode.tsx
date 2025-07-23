import { Handle, Position } from "@xyflow/react";
import { useState } from "react";
import { PopWindow } from "../../../../../common/popWindow";

interface SceneNodeProps {
  data: {
    label: string;
    imgUrl: string;
    sceneItems?: string[];
    sceneRoles?: string[];
    description?: string;
    tip?: string;
    moduleSceneId?: number;
    moduleSceneName?: string;
    createTime?: string;
    updateTime?: string;
  };
  selected?: boolean;
}

function SceneNode({ data, selected }: SceneNodeProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleNodeClick = () => {
    setIsPopupOpen(true);
  };

  return (
    <>
      <div
        className={`w-32 p-2 rounded-lg bg-white shadow-md relative cursor-pointer ${
          selected ? "border-2 border-blue-500" : "border border-gray-300"
        }`}
        onClick={handleNodeClick}
      >
        <div className="relative">
          <img
            src={data.imgUrl}
            alt={data.label}
            className="w-full rounded"
          />
        </div>

        {/* 连接点 */}
        <Handle type="source" position={Position.Right} />
        <Handle type="target" position={Position.Left} />
      </div>

      {/* 节点标签显示在下方 */}
      <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1"
        style={{ pointerEvents: "none" }}
      >
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
          {data.label}
        </span>
      </div>

      {/* 场景大图弹窗 */}
      <PopWindow isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        <div className="flex flex-col items-center gap-4 p-4 max-w-2xl">
          <h3 className="text-xl font-bold text-center">{data.label}</h3>

          {/* 场景图片 */}
          <div className="max-w-full max-h-[50vh] overflow-hidden rounded-lg">
            <img
              src={data.imgUrl}
              alt={data.label}
              className="w-full h-full object-contain"
            />
          </div>

          {/* 模组场景信息 */}
          <div className="w-full bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {data.moduleSceneId && (
                <div>
                  <span className="font-medium text-gray-600">场景ID: </span>
                  <span className="text-gray-800">{data.moduleSceneId}</span>
                </div>
              )}
              {data.moduleSceneName && (
                <div>
                  <span className="font-medium text-gray-600">场景名称: </span>
                  <span className="text-gray-800">{data.moduleSceneName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 场景描述 */}
          {data.description && (
            <div className="w-full">
              <h4 className="font-semibold text-lg mb-2">场景描述</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {data.description}
              </p>
            </div>
          )}

          {/* KP提示 */}
          {data.tip && (
            <div className="w-full">
              <h4 className="font-semibold text-lg mb-2 text-orange-600">KP提示</h4>
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
                {data.sceneItems.map(item => (
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
                {data.sceneRoles.map(role => (
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

          {/* 时间信息 */}
          {(data.createTime || data.updateTime) && (
            <div className="w-full bg-gray-50 p-3 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-gray-600">时间信息</h4>
              <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                {data.createTime && (
                  <div>
                    创建时间:
                    {" "}
                    {data.createTime}
                  </div>
                )}
                {data.updateTime && (
                  <div>
                    更新时间:
                    {" "}
                    {data.updateTime}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopWindow>
    </>
  );
}

export default SceneNode;
