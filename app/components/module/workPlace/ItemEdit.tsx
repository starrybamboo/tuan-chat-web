import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { CharacterCopper } from "@/components/newCharacter/CharacterCopper";
import { useAddMutation, useRenameMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useState } from "react";
import { useModuleContext } from "./context/_moduleContext";

interface ItemEditProps {
  item: StageEntityResponse;
}

export default function ItemEdit({ item }: ItemEditProps) {
  const entityInfo = item.entityInfo || {};
  const { stageId, removeModuleTabItem } = useModuleContext();

  // 本地状态
  const [localItem, setLocalItem] = useState({ ...entityInfo });
  const [name, setName] = useState(item.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [charCount, setCharCount] = useState(entityInfo.tip?.length || 0);
  const MAX_TIP_LENGTH = 300;

  useEffect(() => {
    setLocalItem({ ...entityInfo });
    setCharCount(entityInfo.tip?.length || 0);
    setName(item.name);
  }, [item]);

  // 接入接口
  const { mutate: updateItem } = useAddMutation();
  const { mutate: renameItem } = useRenameMutation("item");

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      updateItem({ stageId: stageId as number, entityType: "item", entityInfo: localItem, name: item.name! });
      if (name !== item.name && name) {
        removeModuleTabItem(item.id!);
        renameItem({ id: item.id!, name });
      }
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalItem({ ...entityInfo });
    setIsEditing(false);
  };

  const generateUniqueFileName = (name: string): string => {
    const timestamp = Date.now();
    return `itemModule-${name}-${timestamp}`;
  };

  const uniqueFileName = generateUniqueFileName(item.name!);

  const handleImageChange = (image: string) => {
    const updatedItem = { ...localItem, image };
    setLocalItem(updatedItem);
    updateItem({
      stageId: stageId as number,
      entityType: "item",
      entityInfo: updatedItem,
      name: item.name!,
    });
  };

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 物品信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 图片 */}
            <CharacterCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleImageChange} fileName={uniqueFileName}>
              <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48">
                <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                  <img
                    src={localItem.image || "./favicon.ico"}
                    alt="Item Image"
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
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">物品名称</span>
                        </label>
                        <input
                          type="text"
                          value={name || ""}
                          onChange={e => setName(e.target.value)}
                          placeholder="请输入物品名称"
                          className="input input-bordered w-full"
                        />
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">物品描述（玩家可见）</span>
                        </label>
                        <textarea
                          value={localItem.description || ""}
                          onChange={e => setLocalItem(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="可以直接展示给玩家的描述"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />
                      </div>
                      <div>
                        <label className="label">
                          <span className="label-text font-bold">提示（仅KP可见）</span>
                        </label>
                        <textarea
                          value={localItem.tip || ""}
                          onChange={(e) => {
                            setLocalItem(prev => ({ ...prev, tip: e.target.value }));
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
                      <h2 className="card-title text-2xl">{name || "未命名物品"}</h2>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        {localItem.description || "暂无描述"}
                      </p>
                      <p className="text-base-content/70 italic whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        提示：
                        {localItem.tip || "暂无提示"}
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
