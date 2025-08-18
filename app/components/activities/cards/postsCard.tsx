import type { Dynamic } from "@/components/activities/activitiesPage";
import { DynamicType } from "@/components/activities/activitiesPage";
import React from "react";

/**
 * 发布的动态预览卡片组件
 */
const DynamicCard: React.FC<{ dynamic: Dynamic }> = ({
  dynamic,
}) => {
  // 用户头部信息
  const renderUserHeader = () => (
    <div className="flex items-center space-x-3 mb-4">
      <img
        src={dynamic.user.avatar}
        alt={dynamic.user.username}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{dynamic.user.username}</h3>
        <p className="text-sm text-gray-500">{dynamic.publishTime}</p>
      </div>
      <button className="text-gray-400 hover:text-gray-600" type="button">
        ⋯
      </button>
    </div>
  );

  // 内容渲染
  const renderContent = () => {
    const { type, content, images, forwardedDynamic } = dynamic;

    return (
      <div className="mb-4">
        <div className="text-gray-400 mb-3">{content}</div>

        {type === DynamicType.IMAGE && images && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`图片${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ))}
          </div>
        )}

        {type === DynamicType.FORWARD && forwardedDynamic && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-2 mb-2">
              <img
                src={forwardedDynamic.user.avatar}
                alt={forwardedDynamic.user.username}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-gray-700">
                @
                {forwardedDynamic.user.username}
              </span>
            </div>
            <div className="text-sm text-gray-700">{forwardedDynamic.content}</div>
          </div>
        )}
      </div>
    );
  };

  // 操作栏
  const renderActions = () => (
    <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
      <button
        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-pink-500"
        type="button"
      >
        <span>{dynamic.isLiked ? "❤️" : "🤍"}</span>
        <span>{dynamic.stats.likes}</span>
      </button>
      <button
        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-500"
        type="button"
      >
        <span>💬</span>
        <span>{dynamic.stats.comments}</span>
      </button>
      <button
        className="flex items-center space-x-1 text-sm text-gray-500 hover:text-green-500"
        type="button"
      >
        <span>📤</span>
        <span>{dynamic.stats.shares}</span>
      </button>
    </div>
  );

  return (
    <div className="bg-base-300 rounded-xl shadow-sm p-6 mb-4 hover:shadow-md transition-shadow">
      {renderUserHeader()}
      {renderContent()}
      {renderActions()}
    </div>
  );
};

export default DynamicCard;
