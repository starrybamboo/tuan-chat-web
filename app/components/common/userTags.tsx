import type { Tag } from "../../../api";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";
import { TagManagementPopup } from "@/components/profile/module/TagManagementPopup";
import React, { useState } from "react";
import { useGetTagsQuery } from "../../../api/hooks/userTagQurryHooks";

interface TagManagementProps {
  userId?: number;
  size?: "default" | "compact"; // 展示的类型，compact会表现的更加紧凑一些
}

function TagManagement({ userId, size = "default" }: TagManagementProps) {
  // 获取标签数据
  const { data: tagsData, refetch, isLoading } = useGetTagsQuery({
    tagType: 1,
    targetId: userId ?? -1,
  });

  const loginUserId = useGlobalContext().userId ?? -1;

  // 使用唯一的key来控制弹窗
  const [isTagPopupOpen, setIsTagPopupOpen] = useSearchParamsState<boolean>(
    "TagManagementPopup",
    false,
  );

  // 本地状态管理标签列表（用于实时更新UI）
  const [localTags, setLocalTags] = useState<Tag[]>([]);

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

  // 打开标签管理弹窗
  const openTagPopup = () => {
    setIsTagPopupOpen(true);
  };

  // 关闭弹窗时重新获取数据以确保同步
  const handleClosePopup = () => {
    setIsTagPopupOpen(false);
    // 重新获取最新数据
    refetch();
  };

  if (isLoading) {
    return (
      <div className="w-full mx-auto p-6 bg-base-200 rounded-xl opacity-90 shadow-lg">
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-md"></span>
          <span className="ml-2">加载标签中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto rounded-xl opacity-90 ${size === "default" ? "shadow-lg bg-base-200 p-6" : "p-2"}`}>
      {/* 标签展示区域 */}
      <div className="mb-2">
        <div className={`flex justify-between items-center ${size === "default" ? "mb-4" : ""}`}>
          {/* compact 不显示 */}
          {size !== "compact" && (
            <h2 className="text-lg font-semibold">玩家标签</h2>
          )}
          {userId === loginUserId && size === "default" && (
            <button
              type="button"
              onClick={openTagPopup}
              className="btn btn-primary flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              添加/管理标签
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tags && tags.length > 0
            ? (
                tags.map(tag => (
                  <span
                    key={tag.tagId}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all hover:shadow-md cursor-default
                      bg-${tag.color}-100 text-${tag.color}-800 ring-1 ring-${tag.color}-500/10`}
                  >
                    {tag.content}
                  </span>
                ))
              )
            : (
                <div className="text-base py-2 text-gray-500">
                  暂无标签
                </div>
              )}
        </div>
      </div>

      {/* 标签管理弹窗 */}
      <TagManagementPopup
        isOpen={isTagPopupOpen}
        onClose={handleClosePopup}
        tags={tags}
        setTags={setLocalTags}
        targetId={userId}
      />
    </div>
  );
}

export default TagManagement;
