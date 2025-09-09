import type { Tag } from "../../../api";

import { useGlobalContext } from "@/components/globalContextProvider";
import React, { useState } from "react";
import { useAddTagMutation, useDeleteTagMutation, useGetTagsQuery } from "../../../api/hooks/userTagQurryHooks";

interface TagManagementProps {
  userId?: number;
  size?: "default" | "compact"; // 展示的类型，compact会表现的更加紧凑一些
}

function TagManagement({ userId, size = "default" }: TagManagementProps) {
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

  // 颜色选项配置
  const colorOptions = [
    { id: "indigo", name: "靳蓝色", hex: "#6366f1" },
    { id: "blue", name: "蓝色", hex: "#3b82f6" },
    { id: "purple", name: "紫色", hex: "#8b5cf6" },
    { id: "teal", name: "蓝绿色", hex: "#14b8a6" },
    { id: "amber", name: "琥珀色", hex: "#f59e0b" },
    { id: "red", name: "红色", hex: "#ef4444" },
    { id: "green", name: "绿色", hex: "#10b981" },
    { id: "pink", name: "粉色", hex: "#ec4899" },
  ];

  // API mutations
  const addTagMutation = useAddTagMutation();
  const deleteTagMutation = useDeleteTagMutation();

  // 当API数据加载完成时更新本地状态
  React.useEffect(() => {
    if (tagsData?.data) {
      setLocalTags(tagsData.data);
    }
    else if (tagsData?.data === null || (Array.isArray(tagsData?.data) && tagsData.data.length === 0)) {
      // 明确处理空数据的情况
      setLocalTags([]);
    }
  }, [tagsData]);

  const tags: Tag[] = localTags;

  // 内联编辑功能
  const startAddingTag = () => {
    setIsAddingTag(true);
    setNewTagContent("");
    setSelectedColor("blue"); // 重置为默认颜色
  };

  const cancelAddingTag = () => {
    setIsAddingTag(false);
    setNewTagContent("");
    setSelectedColor("blue");
  };

  const saveNewTag = async () => {
    if (newTagContent.trim() && newTagContent.length <= 16) {
      try {
        const response = await addTagMutation.mutateAsync({
          content: newTagContent.trim(),
          tagType: 1,
          color: selectedColor,
          targetId: userId ?? -1,
        });

        if (response?.data?.tagId) {
          const newTag: Tag = {
            tagId: response.data.tagId,
            content: newTagContent.trim(),
            color: selectedColor,
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

  if (isLoading && tagsData !== undefined) {
    return (
      <div className="w-full mx-auto p-6 bg-base-200 rounded-xl opacity-90 shadow-lg">
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

      <div className="flex flex-wrap gap-2">
        {tags && tags.length > 0 && (
          tags.map(tag => (
            <div
              key={tag.tagId}
              className="group relative inline-flex items-center"
            >
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all hover:shadow-md cursor-default
                        bg-${tag.color}-100 text-${tag.color}-800 ring-1 ring-${tag.color}-500/10`}
              >
                {tag.content}
              </span>
              {userId === loginUserId && (
                <button
                  type="button"
                  onClick={() => deleteTag(tag.tagId ?? -1)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center justify-center hover:bg-red-600"
                  disabled={deleteTagMutation.isPending}
                >
                  x
                </button>
              )}
            </div>
          ))
        )}

        {/* 内联添加标签 */}
        {userId === loginUserId && (
          isAddingTag
            ? (
                <div className="flex flex-col gap-2 p-3 bg-base-100 rounded-lg border border-base-300">
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
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddingTag}
                      className="btn btn-sm btn-ghost"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 颜色选择器 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-base-content/70">选择颜色:</span>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(color => (
                        <button
                          type="button"
                          key={color.id}
                          onClick={() => setSelectedColor(color.id)}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                            selectedColor === color.id
                              ? "border-base-content shadow-md scale-110"
                              : "border-base-300 hover:border-base-content"
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
                          className={`px-2 py-1 rounded-full text-xs font-medium
                              bg-${selectedColor}-100 text-${selectedColor}-800 ring-1 ring-${selectedColor}-500/10`}
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
                  className="px-3 py-1 rounded-full text-sm border-2 border-dashed border-base-300 text-base-content/60 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  + 添加标签
                </button>
              )
        )}
      </div>
    </div>
  );
}

export default TagManagement;
