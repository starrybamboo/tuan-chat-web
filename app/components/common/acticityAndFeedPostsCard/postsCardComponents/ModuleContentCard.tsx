import React from "react";

interface ModuleContentCardProps {
  name: string;
  description: string;
  moduleImage?: string;
  moduleId: string | number;
  onClick: () => void;
}

/**
 * 模组内容卡片组件
 * 左边显示模组图片，右边显示名称和描述
 */
const ModuleContentCard: React.FC<ModuleContentCardProps> = ({
  name,
  description,
  moduleImage,
  onClick,
}) => {
  return (
    <div
      className="border border-base-300 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* 左侧模组图片 */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          {moduleImage
            ? (
                <img
                  src={moduleImage}
                  alt={name || "模组图片"}
                  className="w-full h-full object-cover rounded-lg"
                />
              )
            : (
                <div className="w-full h-full bg-base-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-xs text-base-content/60">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    模组
                  </div>
                </div>
              )}
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0">
          {/* 模组名称 */}
          <h4 className="font-semibold text-base text-base-content group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {name || "未命名模组"}
          </h4>

          {/* 模组描述 */}
          <p className="text-sm text-base-content/70 line-clamp-3 leading-relaxed">
            {description || "暂无描述"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleContentCard;
