import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useState } from "react";
import { useModuleContext } from "./context/_moduleContext";

interface SceneEditProps {
  scene: StageEntityResponse;
}

export default function SceneEdit({ scene }: SceneEditProps) {
  const entityInfo = scene.entityInfo || {};
  const { stageId, removeModuleTabItem } = useModuleContext();

  // 本地状态
  const [localScene, setLocalScene] = useState({ ...entityInfo });
  const [name, setName] = useState(scene.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [charCount, setCharCount] = useState(entityInfo.tip?.length || 0);
  const MAX_TIP_LENGTH = 300;

  useEffect(() => {
    setLocalScene({ ...entityInfo });
    setCharCount(entityInfo.tip?.length || 0);
    setName(scene.name);
  }, [scene]);

  // 接入接口
  const { mutate: updateScene } = useUpdateEntityMutation(stageId as number);
  // 获取地图
  const mapData = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 5)[0];
  const handleSave = () => {
    setIsTransitioning(true);
    let changed = false;
    const oldName = scene.name;
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      if (name !== scene.name) {
        removeModuleTabItem(scene.id!.toString());
        changed = true;
      }
      updateScene({ id: scene.id!, entityType: 3, entityInfo: localScene, name });
      if (changed && mapData) {
        const oldMap = { ...mapData.entityInfo?.sceneMap } as Record<string, any>;
        const newMap: Record<string, any> = {};
        Object.entries(oldMap).forEach(([key, value]) => {
          if (key === oldName) {
            newMap[name as string] = value;
          }
          else {
            newMap[key] = value;
          };
          // 处理值的替换（只处理数组类型的值）
          if (Array.isArray(value)) {
            // 创建数组副本以避免修改只读数组
            const newArray = [...value] as Array<string>;
            newArray.forEach((item, index) => {
              if (item === oldName) {
                newArray[index] = name as string;
              }
            });
            // 将修改后的数组赋值回newMap
            if (key === oldName) {
              newMap[name as string] = newArray;
            }
            else {
              newMap[key] = newArray;
            }
          }
        });
        updateScene({ id: mapData.id!, entityType: 5, entityInfo: { ...mapData.entityInfo, sceneMap: newMap }, name: mapData.name });
      };
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalScene({ ...entityInfo });
    setIsEditing(false);
  };

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 场景信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 右侧内容 */}
            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {isEditing
                ? (
                    <>
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">场景名称</span>
                        </label>
                        <input
                          type="text"
                          value={name || ""}
                          onChange={e => setName(e.target.value)}
                          placeholder="请输入场景名称"
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">场景描述（玩家可见）</span>
                        </label>
                        <textarea
                          value={localScene.description || ""}
                          onChange={e =>
                            setLocalScene(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="可以直接展示给玩家的描述"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">提示（仅KP可见）</span>
                        </label>
                        <textarea
                          value={localScene.tip || ""}
                          onChange={(e) => {
                            setLocalScene(prev => ({ ...prev, tip: e.target.value }));
                            setCharCount(e.target.value.length);
                          }}
                          placeholder="对KP的提醒（检定，PL需要做什么来获得线索）"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />
                        <div className="text-right mt-1">
                          <span
                            className={`text-sm font-bold ${charCount > MAX_TIP_LENGTH
                              ? "text-error"
                              : "text-base-content/70"
                            }`}
                          >
                            {charCount}
                            {" "}
                            /
                            {MAX_TIP_LENGTH}
                            {charCount > MAX_TIP_LENGTH && <span className="ml-2">(已超出字数上限)</span>}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                : (
                    <>
                      <h2 className="card-title text-2xl">{name || "未命名场景"}</h2>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        {localScene.description || "暂无描述"}
                      </p>
                      <p className="text-base-content/70 italic whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        提示：
                        {localScene.tip || "暂无提示"}
                      </p>
                    </>
                  )}
            </div>
          </div>
          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <>
                    <button
                      type="submit"
                      onClick={handleSave}
                      className={`btn btn-primary ${isTransitioning ? "scale-95" : ""}`}
                      disabled={isTransitioning}
                    >
                      {isTransitioning
                        ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          )
                        : (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              保存
                            </span>
                          )}
                    </button>
                    <button type="button" onClick={handleCancel} className="btn btn-secondary ml-2">
                      取消
                    </button>
                  </>
                )
              : (
                  <button type="button" onClick={handleEdit} className="btn btn-accent">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      编辑
                    </span>
                  </button>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
