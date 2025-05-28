import type { ModuleItemResponse } from "api/models/ModuleItemResponse";
import { useUpdateItemMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useState } from "react";

interface ItemEditProps {
  selectedItem: ModuleItemResponse;
  moduleId: number;
}

export default function ItemEdit({ selectedItem, moduleId }: ItemEditProps) {
  const [item, setItem] = useState<ModuleItemResponse>({ ...selectedItem });
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 字数统计状态
  const [charCount, setCharCount] = useState(item.tip?.length || 0);
  const MAX_DESCRIPTION_LENGTH = 300;

  // 更新物品mutation
  const { mutate: updateItem } = useUpdateItemMutation();

  // 当外部传入的物品更新时同步本地状态
  useEffect(() => {
    setItem({ ...selectedItem });
    setCharCount(selectedItem.tip?.length || 0);
  }, [selectedItem]);

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      updateItem({ ...item, itemId: item.itemId as number, moduleId });
      setIsTransitioning(false);
      setIsEditing(false);
    }, 500);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setItem(prev => ({ ...prev, [name]: value }));

    if (name === "tip") {
      setCharCount(value.length);
    }
  };

  return (
    <div
      className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""
      }`}
    >
      {/* 物品信息卡片 */}
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
                        <span className="label-text font-bold">物品ID</span>
                      </label>
                      <p className="text-sm text-base-content/70">
                        {item.itemId || "未分配"}
                      </p>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">物品名称</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={item.name || ""}
                        onChange={handleInputChange}
                        placeholder="请输入物品名称"
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">所属场景ID</span>
                      </label>
                      <input
                        type="number"
                        name="moduleSceneId"
                        value={item.moduleSceneId || ""}
                        onChange={handleInputChange}
                        placeholder="请输入场景ID"
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text font-bold">提示（仅KP可见）</span>
                      </label>
                      <textarea
                        name="tip"
                        value={item.tip || ""}
                        onChange={handleInputChange}
                        placeholder="仅KP可见的提示或说明"
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
                  </>
                )
              : (
                  <>
                    <h2 className="card-title text-2xl">
                      {item.name || "未命名物品"}
                    </h2>
                    <p className="text-base-content/70">
                      所属场景ID：
                      {item.moduleSceneId || "未指定"}
                    </p>
                    <p className="text-base-content/70 italic">
                      提示：
                      {item.tip || "暂无提示"}
                    </p>
                    <p className="text-xs text-base-content/50">
                      ID:
                      {item.itemId}
                    </p>
                  </>
                )}
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
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
