import type { Tag } from "../../../../api";
import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";
import {
  useAddTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation,
} from "../../../../api/hooks/userTagQurryHooks";

interface TagManagementPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  setTags?: React.Dispatch<React.SetStateAction<Tag[]>>;
  targetId?: number;
}

const TAG_CONTENT_MAX = 20;

export const TagManagementPopup: React.FC<TagManagementPopupProps> = ({
  isOpen,
  onClose,
  tags,
  setTags,
  targetId = -1,
}) => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [newTag, setNewTag] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("indigo");
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  // API hooks
  const addTagMutation = useAddTagMutation();
  const updateTagMutation = useUpdateTagMutation();
  const deleteTagMutation = useDeleteTagMutation();
  // Shake it!!!
  const [errorShakeKey, setErrorShakeKey] = useState(0);
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-800 ring-indigo-500/10",
    blue: "bg-blue-100 text-blue-800 ring-blue-500/10",
    purple: "bg-purple-100 text-purple-800 ring-purple-500/10",
    teal: "bg-teal-100 text-teal-800 ring-teal-500/10",
    amber: "bg-amber-100 text-amber-800 ring-amber-500/10",
    red: "bg-red-100 text-red-800 ring-red-500/10",
    green: "bg-green-100 text-green-800 ring-green-500/10",
    pink: "bg-pink-100 text-pink-800 ring-pink-500/10",
  };

  const colorOptions = [
    { id: "indigo", name: "靛蓝色", hex: "#6366f1" },
    { id: "blue", name: "蓝色", hex: "#3b82f6" },
    { id: "purple", name: "紫色", hex: "#8b5cf6" },
    { id: "teal", name: "蓝绿色", hex: "#14b8a6" },
    { id: "amber", name: "琥珀色", hex: "#f59e0b" },
    { id: "red", name: "红色", hex: "#ef4444" },
    { id: "green", name: "绿色", hex: "#10b981" },
    { id: "pink", name: "粉色", hex: "#ec4899" },
  ];

  // 添加或更新标签
  const handleAddTag = async () => {
    if (newTag.trim() === "")
      return;
    if (newTag.length > TAG_CONTENT_MAX) {
      setErrorShakeKey(prev => prev + 1);
      return;
    }
    try {
      if (isEditMode && editingTagId !== null) {
        await updateTagMutation.mutateAsync({
          tagId: editingTagId,
          // content: newTag, 后端暂时不支持更改内容
          color: selectedColor,
        });
        if (setTags) {
          setTags(prevTags =>
            prevTags.map(tag =>
              tag.tagId === editingTagId
                ? { ...tag, content: newTag, color: selectedColor }
                : tag,
            ),
          );
        }

        // 不退出编辑模式，只清空输入
        setNewTag("");
        setEditingTagId(null);
      }
      else {
        const response = await addTagMutation.mutateAsync({
          content: newTag,
          tagType: 1,
          color: selectedColor,
          targetId,
        });

        if (setTags) {
          const newTagObj: Tag = {
            tagId: response?.data?.tagId ?? Date.now(),
            content: newTag,
            color: selectedColor,
          };
          setTags(prevTags => [...prevTags, newTagObj]);
        }

        setNewTag("");
      }
    }
    catch (error) {
      console.error("操作标签失败:", error);
    }
  };

  // 删除标签
  const handleDeleteTag = async (id: number) => {
    try {
      if (setTags) {
        setTags(prevTags => prevTags.filter(tag => tag.tagId !== id));
      }

      if (id === editingTagId) {
        setIsEditMode(false);
        setEditingTagId(null);
        setNewTag("");
        setSelectedColor("indigo");
      }

      await deleteTagMutation.mutateAsync({ tagId: id });
    }
    catch (error) {
      console.error("删除标签失败:", error);
    }
  };

  // 编辑标签
  const handleEditTag = (tag: Tag) => {
    setNewTag(tag.content ?? ""); // 目前不支持
    setSelectedColor(tag.color ?? "blue");
    setIsEditMode(true);
    setEditingTagId(tag.tagId ?? null);
  };

  // 关闭弹窗时重置
  const handleClose = () => {
    onClose();
    setIsEditMode(false);
    setEditingTagId(null);
    setNewTag("");
  };

  const isLoading
      = addTagMutation.isPending
        || updateTagMutation.isPending
        || deleteTagMutation.isPending;

  return (
    <PopWindow isOpen={isOpen} onClose={handleClose} fullScreen={false}>
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary">
            {isEditMode ? "编辑标签" : "添加新标签"}
          </h2>
          <p className="mt-1">
            {isEditMode
              ? "修改您的标签内容和颜色"
              : "创建新的玩家标签并选择颜色"}
          </p>
          <p>...修改标签内容要等会，颜色倒是可以</p>
        </div>

        <div className="mb-6">
          <label htmlFor="tagInput" className="block text-sm font-medium mb-2">
            标签内容
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="tagInput"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              placeholder="输入标签内容"
              className="flex-1 input input-bordered w-full"
              onKeyUp={e =>
                e.key === "Enter" && !isLoading && handleAddTag()}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn btn-primary"
              disabled={newTag.trim() === "" || isLoading}
            >
              {isLoading
                ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  )
                : isEditMode
                  ? (
                      "更新标签"
                    )
                  : (
                      "添加标签"
                    )}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false);
                  setEditingTagId(null);
                  setNewTag("");
                }}
                className="btn btn-outline"
                disabled={isLoading}
              >
                取消
              </button>
            )}
          </div>
          <div
            key={errorShakeKey}
            style={{
              animation: newTag.length > TAG_CONTENT_MAX ? "quick-shake 0.4s ease-in-out" : "none",
            }}
            className={`text-right text-sm overflow-hidden transition-all duration-300 ease-in-out pt-2 md:text-left md:ml-2 ${
              newTag.length > TAG_CONTENT_MAX
                ? "text-error max-h-8 opacity-100 translate-y-0"
                : "max-h-0 opacity-0 translate-y-2"
            }`}
          >
            标签内容最多
            {TAG_CONTENT_MAX}
            个字喔
          </div>
          {/* 这算彩蛋吗 */}
          <div
            className={`text-pink-800  overflow-hidden transition-all duration-300 ease-in-out pl-2 ${
              errorShakeKey > 5 && newTag.length > TAG_CONTENT_MAX ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            别玩了（恼）
          </div>

        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">选择标签颜色</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {colorOptions.map(color => (
              <div
                key={color.id}
                onClick={() => !isLoading && setSelectedColor(color.id)}
                className={`cursor-pointer rounded-lg p-3 flex flex-col items-center transition-all
                  ${selectedColor === color.id ? "ring-2 ring-primary scale-105" : "hover:scale-105"}
                  ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: color.hex }}
                >
                </div>
                <span className="mt-1 text-xs">{color.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold text-primary mb-3">所有标签</h3>
          <div className="rounded-lg p-4 max-h-60 overflow-y-auto shadow-inner">
            {tags.length === 0
              ? (
                  <div className="text-center py-8 text-base-500">
                    暂无标签，请添加新标签
                  </div>
                )
              : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tags.map(tag => (
                      <div
                        key={tag.tagId}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md
                      ${colorClasses[tag.color as keyof typeof colorClasses]}
                      ${editingTagId === tag.tagId ? "ring-2 ring-primary" : ""}`}
                      >
                        <span className="font-medium">{tag.content}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => !isLoading && handleEditTag(tag)}
                            className="btn btn-sm btn-ghost hover:bg-white/80"
                            aria-label="编辑标签"
                            disabled={isLoading}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              !isLoading
                              && handleDeleteTag(tag.tagId ?? -1)}
                            className="btn btn-sm btn-ghost hover:bg-white/50 text-red-600"
                            aria-label="删除标签"
                            disabled={isLoading}
                          >
                            {deleteTagMutation.isPending
                              && deleteTagMutation.variables?.tagId === tag.tagId
                              ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                )
                              : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>
        </div>
      </div>
    </PopWindow>
  );
};
