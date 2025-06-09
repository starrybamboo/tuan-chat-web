import type { Feed } from "../../../api";
import UserAvatarComponent from "@/components/common/userAvatar";

export default function FeedPreview({ feed }: { feed: Feed }) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-lg mb-4 hover:shadow-xl transition-shadow w-full">
      <div className="card-body p-4 md:p-6">
        {/* 头部 - 包含头像和标题 */}
        <div className="flex items-start gap-3 mb-4">
          <UserAvatarComponent
            userId={feed.userId ?? -1}
            width={10}
            isRounded={true}
            withName={false}
          />
          <div className="flex-1">
            <h2 className="card-title text-base-content">
              {feed.title || "未命名动态"}
              {feed.feedId && (
                <span className="text-sm font-normal text-base-content/60 ml-2">
                  #
                  {feed.feedId}
                </span>
              )}
            </h2>
            {feed.userId && (
              <p className="text-xs text-base-content/60 mt-1">
                用户ID:
                {" "}
                {feed.userId}
              </p>
            )}
          </div>
        </div>

        {/* 正文内容 */}
        {feed.description && (
          <p className="text-base-content/80 text-sm mb-4 whitespace-pre-line">
            {feed.description}
          </p>
        )}

        {/* 操作按钮和元数据 */}
        <div className="card-actions flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="join">
            <button className="join-item btn btn-sm btn-ghost">
              👍 2.5k
            </button>
            <button className="join-item btn btn-sm btn-ghost">
              💬 368
            </button>
            <button className="join-item btn btn-sm btn-ghost">
              🔗 分享
            </button>
          </div>

          <div className="flex flex-col items-end gap-1">
            {(feed.createTime || feed.messageId) && (
              <div className="text-xs text-base-content/50 space-x-2">
                {feed.messageId && (
                  <span>
                    消息ID:
                    {feed.messageId}
                  </span>
                )}
                {feed.createTime && (
                  <span>{feed.createTime}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
