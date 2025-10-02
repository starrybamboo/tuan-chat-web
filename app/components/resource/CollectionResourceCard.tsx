import type { ResourceResponse } from "../../../api/models/ResourceResponse";

interface CollectionResourceCardProps {
  resource: ResourceResponse & {
    /**
     * 收藏id - 用于删除操作
     */
    collectionId?: number;
  };
  /**
   * 格式化日期的函数
   */
  formatDate: (dateString?: string) => string;
  /**
   * 删除资源回调
   */
  onRemoveResource: (resourceId: number) => void;
  /**
   * 是否为移动端模式
   */
  isMobile?: boolean;
}

/**
 * 收藏列表中的资源卡片组件
 * 用于显示收藏列表详情中的资源项，支持桌面端和移动端适配
 */
export function CollectionResourceCard({
  resource,
  formatDate,
  onRemoveResource,
  isMobile = false,
}: CollectionResourceCardProps) {
  const handleRemoveClick = () => {
    if (resource.resourceId) {
      onRemoveResource(resource.resourceId);
    }
  };

  /**
   * 根据资源类型返回对应的图标
   */
  const getResourceIcon = () => {
    const type = resource.typeDescription?.toLowerCase() || "";

    if (type.includes("image"))
      return "🖼️";
    if (type.includes("video"))
      return "🎥";
    if (type.includes("audio"))
      return "🎵";
    if (type.includes("document"))
      return "📄";
    return "📎";
  };

  /**
   * 渲染资源预览区域
   */
  const renderResourcePreview = () => {
    if (resource.url) {
      // 如果是音频文件，使用特殊处理
      if (resource.typeDescription?.toLowerCase().includes("audio")) {
        return (
          <div className="flex items-center justify-center h-full bg-base-200">
            <div className="text-center">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-xs text-base-content/60 px-2">音频文件</div>
            </div>
          </div>
        );
      }

      // 其他类型尝试显示图片
      return (
        <img
          src={resource.url}
          alt={resource.name || "资源"}
          className="w-full h-full object-cover rounded-t-lg"
          onError={(e) => {
            // 图片加载失败时显示对应图标
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="flex items-center justify-center h-full">
                  <div class="text-3xl">${getResourceIcon()}</div>
                </div>
              `;
            }
          }}
        />
      );
    }

    // 没有URL时显示对应图标
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-3xl">{getResourceIcon()}</div>
      </div>
    );
  };

  return (
    <div className="card bg-base-200 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* 资源预览区域 */}
      <div className="relative aspect-video bg-base-300">
        {renderResourcePreview()}

        {/* 删除按钮 */}
        <button
          type="button"
          className="absolute top-2 right-2 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemoveClick}
          title="从收藏列表中移除"
        >
          ×
        </button>

        {/* 资源标签 */}
        <div className="absolute top-2 left-2 flex gap-1">
          {resource.isPublic && (
            <div className="badge badge-sm text-white bg-green-500 border-green-500">
              公开
            </div>
          )}
          {resource.isAi && (
            <div className="badge badge-sm text-white bg-purple-500 border-purple-500">
              AI
            </div>
          )}
        </div>
      </div>

      {/* 资源信息 */}
      <div className="card-body p-3">
        <h4
          className={`font-medium truncate ${isMobile ? "text-sm" : "text-sm"}`}
          title={resource.name || "未命名资源"}
        >
          {resource.name || "未命名资源"}
        </h4>

        <div className="flex justify-between text-xs text-base-content/60">
          <span>{resource.typeDescription || "未知类型"}</span>
          <span>{formatDate(resource.createTime)}</span>
        </div>
      </div>
    </div>
  );
}

export default CollectionResourceCard;
