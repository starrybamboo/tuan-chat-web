import { useGlobalContext } from "@/components/globalContextProvider";
import { BarChartOutlineIcon, EmojiIconWhite, Image2Fill } from "@/icons";
import React, { useEffect, useState } from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function PublishBox() {
  const [content, setContent] = useState("");
  const [rows, setRows] = useState(3);
  const loginUserId = useGlobalContext().userId ?? -1;
  const userQuery = useGetUserInfoQuery(loginUserId);
  const user = userQuery.data?.data;

  const maxLength = 500; // 最大字符数限制
  const currentLength = content.length;

  // 根据内容动态调整高度
  useEffect(() => {
    const lines = content.split("\n").length;
    const estimatedLines = Math.ceil(content.length / 50); // 大约每行50字符
    const totalLines = Math.max(lines, estimatedLines);

    // 最少3行，最多8行
    const newRows = Math.min(Math.max(totalLines, 3), 8);
    setRows(newRows);
  }, [content]);

  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex items-start space-x-4">
        <div className="pointer-events-none relative flex-shrink-0">
          <img
            src={user?.avatar || undefined}
            alt={user?.username}
            className="mask mask-circle w-12 h-12 sm:w-14 sm:h-14 object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="有什么新鲜事想告诉大家？"
              className="w-full p-3 border border-base-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              rows={rows}
            />
          </div>

          {/* 下方操作栏 */}
          <div className="flex items-center justify-between mt-3">
            {/* 左边的功能按钮 */}
            <div className="flex space-x-3">
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200"
                type="button"
                title="添加表情"
              >
                <EmojiIconWhite />
              </button>
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200"
                type="button"
                title="上传图片"
              >
                <Image2Fill />
              </button>
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200"
                type="button"
                title="添加投票"
              >
                <BarChartOutlineIcon />
              </button>
            </div>

            {/* 右边：字数统计和发布按钮 */}
            <div className="flex items-center space-x-3">
              {/* 字数统计 */}
              <span className={`text-xs transition-colors ${
                currentLength > maxLength * 0.8
                  ? "text-warning"
                  : "text-base-content/60"
              }`}
              >
                {currentLength}
                /
                {maxLength}
              </span>

              {/* 发布按钮 */}
              <button
                className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  content.trim()
                    ? "bg-primary text-primary-content hover:bg-primary/90 cursor-pointer shadow-sm hover:shadow"
                    : "bg-base-300 text-base-content/40 cursor-not-allowed"
                }`}
                disabled={!content.trim()}
                type="button"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
