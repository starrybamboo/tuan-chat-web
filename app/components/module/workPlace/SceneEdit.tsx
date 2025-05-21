import type { ModuleScene } from "api";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";

interface SceneEditProps {
  selectedScene: ModuleScene;
}

export default function SceneEdit({ selectedScene }: SceneEditProps) {
  const [scene, setScene] = useState<ModuleScene>({ ...selectedScene });
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 字数统计状态
  const [charCount, setCharCount] = useState(
    scene.sceneDescription?.length || 0,
  );
  const MAX_DESCRIPTION_LENGTH = 300;

  // 当外部传入的场景更新时同步本地状态
  useEffect(() => {
    setScene({ ...selectedScene });
    setCharCount(selectedScene.sceneDescription?.length || 0);
  }, [selectedScene]);

  // 更新场景 mutation
  const { mutate: updateScene } = useMutation({
    mutationKey: ["UpdateScene"],
    mutationFn: async (data: ModuleScene) => {
      const response = await tuanchat.moduleScene.updateScene({
        moduleSceneId: data.moduleSceneId as number,
        moduleSceneName: data.moduleSceneName,
        sceneDescription: data.sceneDescription,
        tip: data.tip,
      });
      return response;
    },
    onError: (error) => {
      console.error("Failed to update scene:", error);
    },
  });

  const handleSave = () => {
    setIsTransitioning(true);
    updateScene(scene, {
      onSuccess: () => {
        setTimeout(() => {
          setIsTransitioning(false);
          setIsEditing(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setScene(prev => ({ ...prev, [name]: value }));

    if (name === "sceneDescription") {
      setCharCount(value.length);
    }
  };

  return (
    <div
      className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""
      }`}
    >
      {/* 场景信息卡片 */}
      <div
        className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className="card-body">
          <div className="flex flex-col gap-4">
            {isEditing
              ? (
                  <>
                    <div>
                      <label className="label">
                        <span className="label-text font-bold">场景ID</span>
                      </label>
                      <p className="text-sm text-base-content/70">
                        {scene.moduleSceneId}
                      </p>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">场景名称</span>
                      </label>
                      <input
                        type="text"
                        name="moduleSceneName"
                        value={scene.moduleSceneName || ""}
                        onChange={handleInputChange}
                        placeholder="请输入场景名称"
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">场景描述</span>
                      </label>
                      <textarea
                        name="sceneDescription"
                        value={scene.sceneDescription || ""}
                        onChange={handleInputChange}
                        placeholder="请输入场景描述"
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
                            <span className="ml-2">(已超出字数上限)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">仅KP可见提示</span>
                      </label>
                      <textarea
                        name="tip"
                        value={scene.tip || ""}
                        onChange={handleInputChange}
                        placeholder="仅KP可见的提示或说明"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                    </div>
                  </>
                )
              : (
                  <>
                    <h2 className="card-title text-2xl">
                      {scene.moduleSceneName || "未命名场景"}
                    </h2>
                    <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                      {scene.sceneDescription || "暂无描述"}
                    </p>
                    <p className="text-base-content/70 italic">
                      提示：
                      {scene.tip || "暂无提示"}
                    </p>
                    <p className="text-xs text-base-content/50">
                      ID:
                      {scene.moduleSceneId}
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
                      className={`btn btn-primary ${isTransitioning ? "scale-95" : ""
                      }`}
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
                  </>
                )
              : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn btn-accent"
                  >
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
