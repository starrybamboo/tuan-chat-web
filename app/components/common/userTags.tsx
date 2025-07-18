import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { TagManagementPopup } from "@/components/profile/module/TagManagementPopup";
import React, { useState } from "react";

interface Tag {
  id: string;
  text: string;
  color: string;
}

function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", text: "策略玩家", color: "indigo" },
    { id: "2", text: "剧情沉浸者", color: "purple" },
    { id: "3", text: "500年老玩家", color: "blue" },
    { id: "4", text: "不是Loli控", color: "amber" },
    { id: "5", text: "至少绝对不是YZC", color: "teal" },
  ]);

  // 使用唯一的key来控制弹窗
  const [isTagPopupOpen, setIsTagPopupOpen] = useSearchParamsState<boolean>(
    "TagManagementPopup",
    false,
  );

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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            添加/管理标签
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium 
                ${colorClasses[tag.color as keyof typeof colorClasses]}`}
            >
              {tag.text}
            </span>
          ))}

          {tags.length === 0 && (
            <div className="text-base italic py-2">
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
        setTags={setTags}
      />
    </div>
  );
}

export default TagManagement;
