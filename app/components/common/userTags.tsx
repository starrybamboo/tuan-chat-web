import type { Tag } from "../../../api";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { TagManagementPopup } from "@/components/profile/module/TagManagementPopup";
import React from "react";
import { useGetTagsQuery } from "../../../api/hooks/userTagQurryHooks";

interface TagManagementProps {
  userId?: number;
}

function TagManagement({ userId }: TagManagementProps) {
  // 获取标签数据
  const { data: tagsData } = useGetTagsQuery({
    tagType: 1,
    targetId: userId ?? -1,
  });
  // 使用唯一的key来控制弹窗
  const [isTagPopupOpen, setIsTagPopupOpen] = useSearchParamsState<boolean>(
    "TagManagementPopup",
    false,
  );

  const tags: Tag[] = tagsData?.data ?? [];
  // 打开标签管理弹窗
  const openTagPopup = () => {
    setIsTagPopupOpen(true);
  };

  return (
    <div className="w-full mx-auto p-6 bg-base-200 rounded-xl opacity-90 shadow-lg">
      {/* 标签展示区域 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">玩家标签</h2>
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
        </div>

        <div className="flex flex-wrap gap-2">
          {tags && tags.length > 0
            ? (
                tags.map(tag => (
                  <span
                    key={tag.tagId} // 直接使用 tagId 作为 key
                    className={`px-2 py-1 rounded text-xs bg-${tag.color}-100 text-${tag.color}-800`}
                  >
                    {tag.content}
                    {" "}
                  </span>
                ))
              )
            : (
                <div className="text-base py-2">
                  暂无标签，点击上方按钮添加
                </div>
              )}

        </div>
      </div>

      {/* 标签管理弹窗 */}
      <TagManagementPopup
        isOpen={isTagPopupOpen}
        onClose={() => setIsTagPopupOpen(false)}
        tags={tags}
      />
    </div>
  );
}

export default TagManagement;
