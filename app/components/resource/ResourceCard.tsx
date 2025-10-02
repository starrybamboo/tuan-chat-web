import { useState } from "react";

import { AddToCollectionModal } from "./AddToCollectionModal";
import AudioWavePlayer from "./AudioWavePlayer";
import MoreBetterImg from "./MoreBetterImg";

interface ResourceCardProps {
  resource: {
    resourceId: number; // 正确的ID字段
    name: string;
    url: string;
    userId: number;
    isPublic?: boolean;
    isAI?: boolean;
    type?: string;
  };
  type: "5" | "6"; // 5: 图片, 6: 音频
  isPublic: boolean;
  onDelete?: (resourceId: number) => void;
  onAddToCollection?: (resourceId: number) => void;
  onLike?: (resourceId: number) => void;
}

/**
 * 单个资源卡片组件
 * 用于显示图片或音频资源的卡片
 */
export function ResourceCard({
  resource,
  type,
  onDelete,
}: ResourceCardProps) {
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(resource.resourceId);
    }
  };

  const handleAddToCollection = () => {
    setIsCollectionModalOpen(true);
  };

  return (
    <>
      <div className="card bg-base-100 shadow-sm hover:shadow-lg transition-all duration-200 border border-base-300 group overflow-hidden">
        {/* 资源预览 */}
        <div className="relative bg-base-200 overflow-hidden">
          {type === "5"
            ? (
                <div className="aspect-[4/3]">
                  <MoreBetterImg
                    src={resource.url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )
            : (
                <div className="aspect-[4/3] pt-8 pb-3 px-3 flex flex-col justify-center">
                  <AudioWavePlayer
                    audioUrl={resource.url}
                    audioName={resource.name}
                    displayName={false}
                    onDelete={() => handleDeleteClick()}
                  />
                </div>
              )}

          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              className="btn btn-sm btn-circle bg-base-100/90 border-0 backdrop-blur-sm hover:bg-base-100"
              onClick={handleDeleteClick}
            >
              <span className="text-xs">X</span>
            </button>
          </div>

          <div className="absolute top-2 left-2 flex gap-1">
            {resource.isPublic && (
              <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
            )}
            {resource.isAI && (
              <div className="badge badge-sm text-white bg-purple-500 border-purple-500">AI</div>
            )}
          </div>
        </div>

        {/* 资源信息 */}
        <div className="card-body p-3">
          <h3 className="card-title text-sm font-medium truncate">
            {resource.name || "未命名素材"}
          </h3>

          {/* 操作按钮 */}
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddToCollection}
            >
              收藏
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm flex-1"
            >
              编辑
            </button>
          </div>
        </div>
      </div>

      {/* 添加到收藏集的弹窗 */}
      <AddToCollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        resourceIds={[resource.resourceId]}
        resourceType={type}
      />
    </>
  );
}
