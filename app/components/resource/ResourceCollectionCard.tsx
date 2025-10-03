import type { CollectionList } from "../../../api/models/CollectionList";

interface ResourceCollectionCardProps {
  collectionList: CollectionList & {
    resourceCount?: number;
    likeCount?: number;
  };
  onAddToCollection?: (collectionId: number) => void;
  _onLike?: (collectionId: number) => void;
  onClick?: (collectionId: number) => void;
  onDelete?: (collectionId: number) => void;
}

/**
 * 收藏列表卡片组件
 * 用于显示收藏列表的卡片
 */
export function ResourceCollectionCard({
  collectionList,
  _onLike,
  onClick,
  onDelete,
}: ResourceCollectionCardProps) {
  const handleCardClick = () => {
    if (onClick && collectionList.collectionListId) {
      onClick(collectionList.collectionListId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && collectionList.collectionListId) {
      onDelete(collectionList.collectionListId);
    }
  };

  return (
    <div
      className="card bg-base-100 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border border-base-300 group"
      onClick={handleCardClick}
    >
      {/* 收藏列表封面 */}
      <div className="relative h-48 bg-base-200">
        {collectionList.coverImageUrl
          ? (
              <img
                src={collectionList.coverImageUrl}
                alt={collectionList.collectionListName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 rounded-t-lg"
                onError={(e) => {
                  e.currentTarget.src = "/moduleDefaultImage.webp";
                }}
              />
            )
          : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-t-lg">
                <div className="text-6xl">📁</div>
              </div>
            )}

        {/* 标签和操作按钮 */}
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
          {collectionList.isPublic && (
            <div className="badge badge-sm text-white bg-green-500 border-green-500">公开</div>
          )}
        </div>
      </div>

      {/* 收藏列表信息 */}
      <div className="card-body p-3">
        <h3 className="card-title text-sm font-medium truncate">
          {collectionList.collectionListName || "素材及测试"}
        </h3>

        {collectionList.description && (
          <p className="text-xs text-base-content/70 mb-2 line-clamp-2">
            {collectionList.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-base-content/60 mb-2">
          <span>
            用户_
            {collectionList.userId || "gozifw"}
          </span>
          <span>
            {(collectionList as any).resourceCount || 0}
            素材
          </span>
        </div>
      </div>
    </div>
  );
}
