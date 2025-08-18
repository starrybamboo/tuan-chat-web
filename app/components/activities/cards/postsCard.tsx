import type { Dynamic } from "@/components/activities/activitiesPage";
import { DynamicType } from "@/components/activities/activitiesPage";
import React from "react";

/**
 * 发布的动态预览卡片组件
 */
function PostsCard({ dynamic }: { dynamic: Dynamic }) {
  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4 sm:p-6 mb-4 hover:shadow-md transition-shadow">
      {/* 用户头部信息 */}
      <div className="flex items-center space-x-3 mb-4">
        <img
          src={dynamic.user.avatar}
          alt={dynamic.user.username}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-medium text-base-content">{dynamic.user.username}</h3>
          <p className="text-sm text-base-content/60">{dynamic.publishTime}</p>
        </div>
        <button className="text-base-content/40 hover:text-base-content/80 transition-colors" type="button">
          ⋯
        </button>
      </div>

      {/* 动态内容 */}
      <div className="mb-4">
        <div className="text-base-content mb-3">{dynamic.content}</div>

        {/* 图片内容 */}
        {dynamic.type === DynamicType.IMAGE && dynamic.images && (
          <div className="grid grid-cols-3 gap-2">
            {dynamic.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`图片${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        {/* 转发内容 */}
        {dynamic.type === DynamicType.FORWARD && dynamic.forwardedDynamic && (
          <div className="border border-base-300 rounded-lg p-4 bg-base-200">
            <div className="flex items-center space-x-2 mb-2">
              <img
                src={dynamic.forwardedDynamic.user.avatar}
                alt={dynamic.forwardedDynamic.user.username}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-base-content/80">
                @
                {dynamic.forwardedDynamic.user.username}
              </span>
            </div>
            <div className="text-sm text-base-content/80">{dynamic.forwardedDynamic.content}</div>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center space-x-4 sm:space-x-6 pt-3 border-t border-base-300">
        <button
          className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-error transition-colors"
          type="button"
        >
          <span>{dynamic.isLiked ? "❤️" : "🤍"}</span>
          <span>{dynamic.stats.likes}</span>
        </button>
        <button
          className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-primary transition-colors"
          type="button"
        >
          <span>💬</span>
          <span>{dynamic.stats.comments}</span>
        </button>
        <button
          className="flex items-center space-x-1 text-sm text-base-content/60 hover:text-success transition-colors"
          type="button"
        >
          <span>📤</span>
          <span>{dynamic.stats.shares}</span>
        </button>
      </div>
    </div>
  );
}

export default PostsCard;
