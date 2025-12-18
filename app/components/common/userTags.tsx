import type { Tag } from "../../../api";

import { useGlobalContext } from "@/components/globalContextProvider";
import { CheckIcon, PlusOutline, XMarkICon } from "@/icons";
import React, { useCallback, useEffect, useState } from "react";
import { useAddTagMutation, useDeleteTagMutation, useGetTagsQuery } from "../../../api/hooks/userTagQurryHooks";

// 颜色选项配置 - 按照指定顺序排列
const COLOR_OPTIONS = [
  { id: "blue", name: "蓝色", hex: "#3b82f6" },
  { id: "green", name: "绿色", hex: "#10b981" },
  { id: "indigo", name: "靛蓝色", hex: "#6366f1" },
  { id: "purple", name: "紫色", hex: "#8b5cf6" },
  { id: "pink", name: "粉色", hex: "#ec4899" },
  { id: "red", name: "红色", hex: "#ef4444" },
  { id: "amber", name: "琥珀色", hex: "#f59e0b" },
  { id: "teal", name: "蓝绿色", hex: "#14b8a6" },
];

// 预定义的颜色类名映射，确保 Tailwind CSS 能够正确识别
const COLOR_CLASS_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 ring-blue-300",
  green: "bg-green-100 text-green-800 ring-green-300",
  indigo: "bg-indigo-100 text-indigo-800 ring-indigo-300",
  purple: "bg-purple-100 text-purple-800 ring-purple-300",
  pink: "bg-pink-100 text-pink-800 ring-pink-300",
  red: "bg-red-100 text-red-800 ring-red-300",
  amber: "bg-amber-100 text-amber-800 ring-amber-300",
  teal: "bg-teal-100 text-teal-800 ring-teal-300",
};

interface TagManagementProps {
  userId?: number;
  size?: "default" | "compact"; // 展示的类型，compact会表现的更加紧凑一些
  canEdit?: boolean; // 是否允许删除和增加？
}

function TagManagement({ userId, size = "default", canEdit }: TagManagementProps) {
  // 获取标签数据
  const { data: tagsData, isLoading } = useGetTagsQuery({
    tagType: 1,
    targetId: userId ?? -1,
  });

  const loginUserId = useGlobalContext().userId ?? -1;

  // 本地状态管理标签列表（用于实时更新UI）
  const [localTags, setLocalTags] = useState<Tag[]>([]);

  // 内联编辑状态
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagContent, setNewTagContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");

  // API mutations
  const addTagMutation = useAddTagMutation();
  const deleteTagMutation = useDeleteTagMutation();

  // 获取颜色类名的函数，如果颜色不存在则返回蓝色
  const getColorClass = (color: string): string => {
    return COLOR_CLASS_MAP[color] || COLOR_CLASS_MAP.blue;
  };

  // 验证并修正颜色值的函数
  const validateColor = useCallback((color: string): string => {
    return COLOR_OPTIONS.find(option => option.id === color)?.id || "blue";
  }, []);

  // 当API数据加载完成时更新本地状态
  useEffect(() => {
    if (tagsData?.data) {
      // 修正颜色值，确保所有颜色都是有效的
      const validatedTags = tagsData.data.map(tag => ({
        ...tag,
        color: validateColor(tag.color || "blue"),
      }));
      setLocalTags(validatedTags);
    }
    else if (tagsData?.data === null || (Array.isArray(tagsData?.data) && tagsData.data.length === 0)) {
      // 明确处理空数据的情况
      setLocalTags([]);
    }
  }, [tagsData, validateColor]);

  const tags: Tag[] = localTags;

  // 判断是否可编辑
  const isEditable = canEdit !== false && userId === loginUserId;

  // 内联编辑功能
  const startAddingTag = () => {
    setIsAddingTag(true);
    setNewTagContent("");
    setSelectedColor("blue");
  };

  const cancelAddingTag = () => {
    setIsAddingTag(false);
    setNewTagContent("");
    setSelectedColor("blue");
  };

  const saveNewTag = async () => {
    if (newTagContent.trim() && newTagContent.length <= 16) {
      try {
        const validatedColor = validateColor(selectedColor);
        const response = await addTagMutation.mutateAsync({
          content: newTagContent.trim(),
          tagType: 1,
          color: validatedColor,
          targetId: userId ?? -1,
        });

        if (response?.data?.tagId) {
          const newTag: Tag = {
            tagId: response.data.tagId,
            content: newTagContent.trim(),
            color: validatedColor,
          };
          setLocalTags(prev => [...prev, newTag]);
        }

        setIsAddingTag(false);
        setNewTagContent("");
        setSelectedColor("blue");
      }
      catch (error) {
        console.error("添加标签失败:", error);
      }
    }
  };

  const deleteTag = async (tagId: number) => {
    try {
      await deleteTagMutation.mutateAsync({ tagId });
      setLocalTags(prev => prev.filter(tag => tag.tagId !== tagId));
    }
    catch (error) {
      console.error("删除标签失败:", error);
    }
  };

  // 获取标签样式 - 只有标签本身受 size 影响
  const getTagStyles = () => {
    if (size === "compact") {
      return {
        tag: "px-2 py-0.5 text-xs",
        deleteButton: "w-4 h-4 text-xs -top-1 -right-1",
        gap: "gap-1",
      };
    }
    // default size
    return {
      tag: "px-3 py-1 text-sm",
      deleteButton: "w-5 h-5 text-xs -top-2 -right-2",
      gap: "gap-2",
    };
  };

  const tagStyles = getTagStyles();

  if (isLoading && tagsData !== undefined) {
    return (
      <div className="w-full mx-auto bg-base-200 rounded-xl opacity-90 shadow-lg p-6">
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-md text-base-content"></span>
          <span className="ml-2 text-base-content">加载标签中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto rounded-xl opacity-90 p-2">
      {/* 标签展示区域 */}
      <div className={`flex flex-wrap ${tagStyles.gap}`}>
        {tags && tags.length > 0 && (
          tags.map(tag => (
            <div
              key={tag.tagId}
              className="group relative inline-flex items-center"
            >
              <span
                className={`${tagStyles.tag} rounded-full font-medium transition-all hover:shadow-md cursor-default ring-1 ${getColorClass(tag.color || "blue")}`}
              >
                {tag.content}
              </span>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => deleteTag(tag.tagId ?? -1)}
                  className={`absolute ${tagStyles.deleteButton} bg-red-500 text-white rounded-full
                             flex items-center justify-center hover:bg-red-600
                             shadow-sm border border-white/20 duration-300
                             opacity-0 md:group-hover:opacity-50 md:hover:opacity-100
                             touch:opacity-70 active:opacity-100`}
                  disabled={deleteTagMutation.isPending}
                  title="删除标签"
                >
                  <XMarkICon />
                </button>
              )}
            </div>
          ))
        )}

        {/* 内联添加标签 */}
        {isEditable && (
          isAddingTag
            ? (
                <div className="flex flex-col gap-2 p-3 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                  {/* 输入框和按钮行 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagContent}
                      onChange={e => setNewTagContent(e.target.value)}
                      placeholder="输入标签内容"
                      className="input input-sm input-bordered text-sm flex-1"
                      maxLength={16}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          saveNewTag();
                        if (e.key === "Escape")
                          cancelAddingTag();
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveNewTag}
                      className="btn btn-sm btn-success"
                      disabled={!newTagContent.trim() || addTagMutation.isPending}
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddingTag}
                      className="btn btn-sm btn-ghost"
                    >
                      <XMarkICon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* 颜色选择器 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-base-content/70">选择颜色:</span>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          type="button"
                          key={color.id}
                          onClick={() => setSelectedColor(color.id)}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${
                            selectedColor === color.id
                              ? "border-base-content shadow-md scale-110"
                              : "border-base-300 hover:border-base-content active:border-base-content"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    {/* 预览效果 */}
                    {newTagContent.trim() && (
                      <div className="mt-1">
                        <span className="text-xs text-base-content/70">预览: </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all hover:shadow-md cursor-default ring-1 ${getColorClass(selectedColor)}`}
                        >
                          {newTagContent.trim()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            : (
                <button
                  type="button"
                  onClick={startAddingTag}
                  className="px-3 py-1 rounded-full text-sm border-2 border-dashed border-base-300
                           text-base-content/60 hover:border-primary hover:text-primary active:border-primary active:text-primary
                           transition-colors cursor-pointer flex items-center gap-1"
                >
                  <PlusOutline className="w-4 h-4" />
                  <span>添加标签</span>
                </button>
              )
        )}

        {/* 无标签且无法编辑时的提示 */}
        {(!tags || tags.length === 0) && !isEditable && (
          <div className="text-base-content/50 text-sm">
            暂无标签
          </div>
        )}
      </div>
    </div>
  );
}

export default TagManagement;
