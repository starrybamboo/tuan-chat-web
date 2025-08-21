import type { MomentFeedRequest } from "../../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import { BarChartOutlineIcon, EmojiIconWhite, Image2Fill } from "@/icons";
import React, { useEffect, useState } from "react";
import { usePublishMomentFeedMutation } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function PublishBox() {
  const [content, setContent] = useState("");
  const [rows, setRows] = useState(3);
  const [isPublishing, setIsPublishing] = useState(false);
  const loginUserId = useGlobalContext().userId ?? -1;
  const userQuery = useGetUserInfoQuery(loginUserId);
  const user = userQuery.data?.data;

  // 使用发布动态的 mutation
  const publishMutation = usePublishMomentFeedMutation();

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

  // 处理发布动态
  const handlePublish = async () => {
    if (!content.trim() || currentLength > maxLength || isPublishing) {
      return;
    }

    setIsPublishing(true);

    try {
      const request: MomentFeedRequest = {
        content: content.trim(),
        // type, images, tags ?
      };

      await publishMutation.mutateAsync(request);

      // 发布成功后清空内容
      setContent("");
      setRows(3);

      // TODO: 添加成功提示
      // console.log("发布成功！");
    }
    catch (error) {
      console.error("发布动态失败:", error);
      // TODO: 添加错误提示
    }
    finally {
      setIsPublishing(false);
    }
  };

  // 检查是否可以发布
  const canPublish = content.trim() && currentLength <= maxLength && !isPublishing;

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
              disabled={isPublishing}
            />

            {/* 发布中的加载状态 */}
            {isPublishing && (
              <div className="absolute inset-0 bg-base-100/80 rounded-lg flex items-center justify-center">
                <div className="loading loading-spinner loading-sm text-primary"></div>
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {publishMutation.isError && (
            <div className="mt-2 text-sm text-error">
              发布失败，请重试
            </div>
          )}

          {/* 下方操作栏 */}
          <div className="flex items-center justify-between mt-3">
            {/* 左边的功能按钮 */}
            <div className="flex space-x-3">
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 disabled:opacity-50"
                type="button"
                title="添加表情"
                disabled={isPublishing}
              >
                <EmojiIconWhite />
              </button>
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 disabled:opacity-50"
                type="button"
                title="上传图片"
                disabled={isPublishing}
              >
                <Image2Fill />
              </button>
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 disabled:opacity-50"
                type="button"
                title="添加投票"
                disabled={isPublishing}
              >
                <BarChartOutlineIcon />
              </button>
            </div>

            {/* 右边：字数统计和发布按钮 */}
            <div className="flex items-center space-x-3">
              {/* 字数统计 */}
              <span className={`text-xs transition-colors ${
                currentLength > maxLength * 0.8
                  ? currentLength > maxLength
                    ? "text-error"
                    : "text-warning"
                  : "text-base-content/60"
              }`}
              >
                {currentLength}
                /
                {maxLength}
              </span>

              {/* 发布按钮 */}
              <button
                className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 ${
                  canPublish
                    ? "bg-primary text-primary-content hover:bg-primary/90 cursor-pointer shadow-sm hover:shadow"
                    : "bg-base-300 text-base-content/40"
                }`}
                disabled={!canPublish}
                onClick={handlePublish}
                type="button"
              >
                {isPublishing && (
                  <div className="loading loading-spinner loading-xs"></div>
                )}
                <span>发布</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
