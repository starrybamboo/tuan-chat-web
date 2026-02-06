import type { ResourceResponse } from "../../../../api/models/ResourceResponse";
import { useState } from "react";
import { toast } from "react-hot-toast";
import UserAvatarComponent from "../../common/userAvatar";
import { AddToCollectionModal } from "../modals/AddToCollectionModal";
import { EditResourceModal } from "../modals/EditResourceModal";
import AudioWavePlayer from "../utils/AudioWavePlayer";
import MoreBetterImg from "../utils/MoreBetterImg";

interface ResourceCardProps {
  resource: ResourceResponse;
  type: "5" | "6"; // 5: ͼƬ, 6: 音频
  isPublic: boolean;
  onDelete?: (resourceId: number) => void;
  onAddToCollection?: (resourceId: number) => void;
  onLike?: (resourceId: number) => void;
  canEdit?: boolean;
}

/**
 * 单个资源卡片组件
 * 用于显示图片或音频资源的卡片
 */
export function ResourceCard({
  resource,
  type,
  onDelete,
  canEdit,
}: ResourceCardProps) {
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Simple mobile detection based on window width
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;

  const handleDeleteClick = () => {
    if (onDelete && resource.resourceId) {
      onDelete(resource.resourceId);
    }
  };

  const handleAddToCollection = () => {
    setIsCollectionModalOpen(true);
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
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
                    audioUrl={resource.url ? resource.url : ""}
                    audioName={resource.name}
                    displayName={false}
                    onDelete={() => handleDeleteClick()}
                  />
                </div>
              )}

          <div className="absolute top-2 right-2 flex gap-1 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              className="btn btn-sm btn-circle bg-base-100/90 border-0 backdrop-blur-sm hover:bg-base-100"
              onClick={handleAddToCollection}
              title="收藏"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364 4.5 4.5 0 00-6.364 0L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          <div className="absolute top-2 left-2 flex gap-1">
            {resource.isPublic && (
              <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
            )}
            {resource.isAi && (
              <div className="badge badge-sm text-white bg-purple-500 border-purple-500">AI</div>
            )}
          </div>
        </div>

        {/* 资源信息 */}
        <div className="card-body p-3">
          <h3 className="card-title text-sm font-medium truncate">
            {resource.name || "未命名素材"}
          </h3>

          <div className={`flex justify-between items-center text-base-content/60 ${isMobile ? "text-xs" : "text-xs"} gap-2`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UserAvatarComponent
                userId={resource.userId ?? -1}
                width={6}
                isRounded={true}
                withName={true}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          {canEdit && (
            <div className="card-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm w-full"
                onClick={handleEdit}
              >
                编辑
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 添加到收藏集的弹窗 */}
      <AddToCollectionModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        resourceIds={resource.resourceId !== undefined ? [resource.resourceId] : []}
        resourceType={type}
      />

      {/* 编辑资源的弹窗 */}
      <EditResourceModal
        key={resource.resourceId} // 使用resourceId作为key强制重新渲染
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        resource={resource}
        onSuccess={() => {
          toast.success("资源更新成功");
        }}
        onDelete={onDelete}
      />
    </>
  );
}
