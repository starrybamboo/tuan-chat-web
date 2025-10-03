interface EmptyStateProps {
  type: "resources" | "collections";
  isPublic: boolean;
  icon?: string;
  title?: string;
  description?: string;
}

/**
 * 空状态组件
 * 用于显示没有数据时的占位内容
 */
export function EmptyState({
  type,
  isPublic,
  icon,
  title,
  description,
}: EmptyStateProps) {
  const getDefaultContent = () => {
    if (type === "resources") {
      return {
        icon: "📁",
        title: "暂无资源",
        description: !isPublic ? "上传您的第一个素材吧" : "暂时没有公开的素材",
      };
    }
    else {
      return {
        icon: "📁",
        title: "暂无素材集",
        description: !isPublic ? "创建您的第一个素材集吧" : "暂时没有公开的素材集",
      };
    }
  };

  const defaultContent = getDefaultContent();

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] h-64 text-base-content/60 bg-base-100">
      <div className="text-6xl mb-4">{icon || defaultContent.icon}</div>
      <div className="text-lg font-medium mb-2">{title || defaultContent.title}</div>
      <div className="text-sm text-center max-w-sm">
        {description || defaultContent.description}
      </div>
    </div>
  );
}
