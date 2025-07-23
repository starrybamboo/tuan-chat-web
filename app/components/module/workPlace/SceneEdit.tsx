import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { CharacterCopper } from "@/components/newCharacter/CharacterCopper";
import { useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
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
  const [charCount, setCharCount] = useState(entityInfo.sceneDescription?.length || 0);
  const MAX_DESCRIPTION_LENGTH = 300;

  useEffect(() => {
    setLocalScene({ ...entityInfo });
    setCharCount(entityInfo.sceneDescription?.length || 0);
    setName(scene.name);
  }, [scene]);

  // 接入接口
  const { mutate: updateScene } = useUpdateEntityMutation(stageId as number);
  // const { mutate: renameScene } = useRenameMutation("scene");

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      if (name !== scene.name) {
        removeModuleTabItem(scene.id!.toString());
      }
      updateScene({ id: scene.id!, entityInfo: localScene, name, entityType: "scene" });
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalScene({ ...entityInfo });
    setIsEditing(false);
  };

  const generateUniqueFileName = (name: string): string => {
    const timestamp = Date.now();
    return `sceneModule-${name}-${timestamp}`;
  };

  const uniqueFileName = generateUniqueFileName(scene.name!);

  const handleAvatarChange = (avatar: string) => {
    const updatedScene = { ...localScene, image: avatar };
    setLocalScene(updatedScene);
    updateScene({
      id: scene.id!,
      entityType: "scene",
      entityInfo: updatedScene,
      name: scene.name!,
    });
  };

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 场景信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 头像 */}
            <CharacterCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleAvatarChange} fileName={uniqueFileName}>
              <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48">
                <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                  <img
                    src={localScene.image || "./favicon.ico"}
                    alt="Scene Image"
                    className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </CharacterCopper>

            {/* 右侧内容 */}
            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {isEditing
                ? (
                    <>
                      <p>场景名称：</p>
                      <input
                        type="text"
                        value={name || ""}
                        onChange={e => setName(e.target.value)}
                        placeholder="场景名称"
                        className="input input-bordered w-full text-lg font-bold"
                      />
                      <p>场景描述：</p>
                      <textarea
                        value={localScene.sceneDescription || ""}
                        onChange={(e) => {
                          setLocalScene(prev => ({ ...prev, sceneDescription: e.target.value }));
                          setCharCount(e.target.value.length);
                        }}
                        placeholder="场景描述"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                      <div className="text-right mt-1">
                        <span
                          className={`text-sm font-bold ${charCount > MAX_DESCRIPTION_LENGTH
                            ? "text-error"
                            : "text-base-content/70"
                          }`}
                        >
                          {charCount}
                          /
                          {MAX_DESCRIPTION_LENGTH}
                          {charCount > MAX_DESCRIPTION_LENGTH && (
                            <span className="ml-2">(已超出描述字数上限)</span>
                          )}
                        </span>
                      </div>
                      <p>提示（KP可见）：</p>
                      <textarea
                        value={localScene.tip || ""}
                        onChange={e => setLocalScene(prev => ({ ...prev, tip: e.target.value }))}
                        placeholder="KP提示"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                    </>
                  )
                : (
                    <>
                      <h2 className="card-title text-2xl">{name || "未命名场景"}</h2>
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
