import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { useAddMutation, useRenameMutation } from "api/hooks/moduleQueryHooks";
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
  const { mutate: updateScene } = useAddMutation();
  const { mutate: renameScene } = useRenameMutation();

  // 干净的文本
  // const cleanText = (text: string) => {
  //   if (!text)
  //     return "";
  //   return text
  //     .replace(/\r\n/g, "\n")
  //     .replace(/ {2,}/g, " ")
  //     .replace(/\n{2,}/g, "\n")
  //     .replace(/\s+$/g, "");
  // };

  const handleSave = () => {
    setIsTransitioning(true);
    // 这里只做本地保存，不调接口
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      updateScene({ stageId: stageId as number, entityType: "scene", entityInfo: localScene, operationType: 0, name: scene.name! });
      if (name !== scene.name) {
        removeModuleTabItem(scene.createTime! + scene.name);
        renameScene({ stageId: stageId as number, entityType: "scene", oldName: scene.name!, newName: name! });
      }
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalScene({ ...entityInfo });
    setIsEditing(false);
  };

  return (
    <div
      className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}
    >
      {/* 场景信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex flex-col gap-4">
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
                        value={localScene.sceneDescription || ""}
                        onChange={e => setLocalScene(prev => ({ ...prev, sceneDescription: e.target.value }))}
                        placeholder="场景描述"
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
                        placeholder="只有KP可见的描述或提醒"
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
                          /
                          {MAX_TIP_LENGTH}
                          {charCount > MAX_TIP_LENGTH && (
                            <span className="ml-2">(已超出字数上限)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )
              : (
                  <>
                    <h2 className="card-title text-2xl">
                      { name || "未命名场景"}
                    </h2>
                    <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                      {localScene.sceneDescription || "暂无描述"}
                    </p>
                    <p className="text-base-content/70 italic whitespace-pre-wrap break-words max-w-full overflow-hidden">
                      提示：
                      {localScene.tip || "暂无提示"}
                    </p>
                  </>
                )}
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
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                              保存
                            </span>
                          )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn btn-secondary ml-2"
                    >
                      取消
                    </button>
                  </>
                )
              : (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="btn btn-accent"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
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
