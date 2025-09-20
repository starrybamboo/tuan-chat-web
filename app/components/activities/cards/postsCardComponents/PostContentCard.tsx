import React from "react";

interface PostContentCardProps {
  title: string;
  description: string;
  coverImage?: string;
  communityId: string | number;
  postId: string | number;
  onClick: () => void;
}

/**
 * 帖子内容卡片组件
 * 左边显示封面图，右边显示标题和正文预览
 */
const PostContentCard: React.FC<PostContentCardProps> = ({
  title,
  description,
  coverImage,
  onClick,
}) => {
  return (
    <div
      className="border border-base-300 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* 左侧封面图 */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          {coverImage
            ? (
                <img
                  src={coverImage}
                  alt={title || "帖子封面"}
                  className="w-full h-full object-cover rounded-lg"
                />
              )
            : (
                <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-xs text-base-content/60">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    帖子
                  </div>
                </div>
              )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h4 className="font-semibold text-base text-base-content group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {title || "无标题"}
          </h4>

          {/* 描述/正文预览 */}
          <p className="text-sm text-base-content/70 line-clamp-3 leading-relaxed">
            {description || "暂无内容"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PostContentCard;
