import type { CollectionList } from "../../../api/models/CollectionList";

import { ApiError } from "api/core/ApiError";

import { useState } from "react";

import { toast } from "react-hot-toast";
import { useBatchAddResourcesToCollectionMutation, useGetUserResourceCollectionsByTypeQuery } from "../../../api/hooks/resourceQueryHooks";

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceIds: number[];
  resourceType: string; // "5" for images, "6" for audio
}

/**
 * 添加资源到收藏集的弹窗组件
 */
export function AddToCollectionModal({
  isOpen,
  onClose,
  resourceIds,
  resourceType,
}: AddToCollectionModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取用户的素材集列表
  const { data: collectionsData, isLoading } = useGetUserResourceCollectionsByTypeQuery(
    { type: resourceType, pageNo: 1, pageSize: 100 },
    { enabled: isOpen },
  );

  // 批量添加到收藏集的 mutation
  const batchAddMutation = useBatchAddResourcesToCollectionMutation();

  const collections = collectionsData?.data?.list || [];

  const handleSubmit = async () => {
    if (!selectedCollectionId) {
      toast.error("请选择一个素材集");
      return;
    }

    setIsSubmitting(true);
    try {
      await batchAddMutation.mutateAsync({
        collectionListId: selectedCollectionId,
        resourceType,
        resourceIds,
      });

      toast.success(`成功添加 ${resourceIds.length} 个资源到素材集`);
      onClose();
    }
    catch (error) {
      console.error("添加到素材集失败:", error);
      if (error instanceof ApiError) {
        toast.error(error.body?.errMsg);
      }
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCollectionId(null);
    onClose();
  };

  if (!isOpen)
    return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-md">
        <h3 className="font-bold text-lg mb-4">选择素材集</h3>

        {isLoading
          ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )
          : collections.length === 0
            ? (
                <div className="text-center py-8 text-base-content/70">
                  <p>暂无素材集</p>
                  <p className="text-sm mt-2">请先创建一个素材集</p>
                </div>
              )
            : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {collections.map((collection: CollectionList, index: number) => (
                    <label
                      key={collection.collectionListId || `collection-${index}`}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-base-300 hover:bg-base-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="collection"
                        className="radio radio-primary"
                        value={collection.collectionListId || 0}
                        checked={selectedCollectionId === collection.collectionListId}
                        onChange={e => setSelectedCollectionId(Number(e.target.value))}
                        disabled={!collection.collectionListId}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{collection.collectionListName}</div>
                        {collection.description && (
                          <div className="text-sm text-base-content/70">{collection.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedCollectionId || isSubmitting || collections.length === 0}
          >
            {isSubmitting
              ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    添加中...
                  </>
                )
              : (
                  `添加 ${resourceIds.length} 个资源`
                )}
          </button>
        </div>
      </div>
    </div>
  );
}
