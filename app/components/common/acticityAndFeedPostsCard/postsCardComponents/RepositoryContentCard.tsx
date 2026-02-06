import React from "react";

interface RepositoryContentCardProps {
  name: string;
  description: string;
  repositoryImage?: string;
  repositoryId: string | number;
  onClick: () => void;
}

/**
 * 仓库内容卡片组件
 * 左边显示仓库图片，右边显示名称和描述
 */
const RepositoryContentCard: React.FC<RepositoryContentCardProps> = ({
  name,
  description,
  repositoryImage,
  onClick,
}) => {
  return (
    <div
      className="border border-base-300 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* 左侧仓库图片 */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          {repositoryImage
            ? (
                <img
                  src={repositoryImage}
                  alt={name || "仓库图片"}
                  className="w-full h-full object-cover rounded-lg"
                />
              )
            : (
                <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-xs text-base-content/60">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    仓库
                  </div>
                </div>
              )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 仓库名称 */}
          <h4 className="font-semibold text-base text-base-content group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {name || "未命名仓库"}
          </h4>

          {/* 仓库描述 */}
          <p className="text-sm text-base-content/70 line-clamp-3 leading-relaxed">
            {description || "暂无描述"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RepositoryContentCard;
