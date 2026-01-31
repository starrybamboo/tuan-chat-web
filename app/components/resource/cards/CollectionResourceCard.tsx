import type { ResourceResponse } from "../../../../api/models/ResourceResponse";
import AudioWavePlayer from "../utils/AudioWavePlayer";
import MoreBetterImg from "../utils/MoreBetterImg";

interface CollectionResourceCardProps {
  resource: ResourceResponse;
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
    return "📎";
  };

  /**
   * 渲染资源预览区域
   */
  const renderResourcePreview = () => {
    if (resource.type) {
      // 如果是音频文件，使用 AudioWavePlayer
      if (resource.type === "6") {
        return (
          <div className="aspect-[4/3] pt-8 pb-3 px-3 flex flex-col justify-center">
            <AudioWavePlayer
              audioUrl={resource.url ? resource.url : ""}
              audioName={resource.name || "音频文件"}
              displayName={false}
              className=""
            />
          </div>
        );
      }

      // 如果是图片文件，使用 MoreBetterImg
      if (resource.type === "5") {
        return (
          <div className="aspect-[4/3]">
            <MoreBetterImg
              src={resource.url}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        );
      }
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
      <div className="relative aspect-[4/3] bg-base-300 overflow-hidden">
        {renderResourcePreview()}
        {/* 删除按钮 */}
        <button
          type="button"
          className="absolute top-2 right-2 btn glass btn-xs btn-circle group-hover:opacity-100 transition-opacity"
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
      <div className="card-body p-2">
        <h4
          className={`font-medium truncate ${isMobile ? "text-xs" : "text-sm"}`}
          title={resource.name || "未命名资源"}
        >
          {resource.name || "未命名资源"}
        </h4>

        <div className={`flex justify-between text-base-content/60 ${isMobile ? "text-xs" : "text-xs"}`}>
          <span>{resource.typeDescription || "未知类型"}</span>
          <span>{formatDate(resource.createTime)}</span>
        </div>
      </div>
    </div>
  );
}

