import type { CollectionList } from "../../../../api/models/CollectionList";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useDeleteCollectionListMutation,
  useRemoveFromListMutation,
  useUpdateCollectionListMutation,
} from "../../../../api/hooks/collectionQueryHooks";
import {
  useGetPublicResourceCollectionsByTypeQuery,
  useGetUserResourceCollectionsByTypeQuery,
} from "../../../../api/hooks/resourceQueryHooks";
import { ResourceCollectionCard } from "../cards/ResourceCollectionCard";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../ui/LoadingState";
import { Pagination } from "../ui/Pagination";
import { CollectionListDetail } from "./CollectionListDetail";

interface ResourceCollectionListProps {
  type: "5" | "6"; // 5: 图片, 6: 音频
  isPublic: boolean;
  searchText?: string;
  sortBy?: string;
}

export function ResourceCollectionList({ type, isPublic, searchText: _searchText = "", sortBy: _sortBy = "latest" }: ResourceCollectionListProps) {
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionList | null>(null);

  // Mutations
  const updateCollectionListMutation = useUpdateCollectionListMutation();
  const deleteCollectionListMutation = useDeleteCollectionListMutation();
  const removeFromListMutation = useRemoveFromListMutation();

  // 获取资源集合列表
  const publicQuery = useGetPublicResourceCollectionsByTypeQuery(
    { type, pageNo, pageSize },
    { enabled: isPublic },
  );
  const userQuery = useGetUserResourceCollectionsByTypeQuery(
    { type, pageNo, pageSize },
    { enabled: !isPublic },
  );

  const { data: collectionsData, isLoading } = isPublic ? publicQuery : userQuery;

  const collections = collectionsData?.data?.list || [];

  const handleCollectionClick = (collectionId: number) => {
    // 从列表中找到对应的收藏列表并打开弹窗
    const collection = collections.find((c: any) =>
      (c.collectionListId || c.id) === collectionId,
    );
    if (collection) {
      setSelectedCollection(collection);
      setIsDetailModalOpen(true);
    }
    else {
      toast.error("找不到该收藏列表");
    }
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCollection(null);
  };

  const handleEditCollection = (updatedCollection: CollectionList) => {
    const collectionListId = updatedCollection.collectionListId;
    if (!collectionListId) {
      toast.error("缺少收藏列表ID，无法更新");
      return;
    }
    updateCollectionListMutation.mutate({
      collectionListId,
      collectionListName: updatedCollection.collectionListName,
      description: updatedCollection.description,
      isPublic: updatedCollection.isPublic,
      resourceListType: updatedCollection.resourceListType,
      coverImageUrl: updatedCollection.coverImageUrl,
    }, {
      onSuccess: () => {
        toast.success("收藏列表更新成功");
        setSelectedCollection(updatedCollection);
        // 不需要手动refetch，mutation已经配置了缓存管理
      },
      onError: () => {
        toast.error("更新失败，请重试");
      },
    });
  };

  const handleDeleteCollection = (collectionListId: number) => {
    deleteCollectionListMutation.mutate(collectionListId, {
      onSuccess: () => {
        toast.success("收藏列表删除成功");
        setIsDetailModalOpen(false);
        setSelectedCollection(null);
        // 不需要手动refetch，mutation已经配置了缓存管理
      },
      onError: () => {
        toast.error("删除失败，请重试");
      },
    });
  };

  const handleRemoveResource = (collectionId: number) => {
    if (!selectedCollection?.collectionListId) {
      toast.error("收藏列表ID不存在");
      return;
    }

    removeFromListMutation.mutate({
      collectionListId: selectedCollection.collectionListId,
      collectionId,
    }, {
      onSuccess: () => {
        toast.success("资源已从收藏列表中移除");
        // 可以选择性地刷新详情数据
      },
      onError: () => {
        toast.error("移除失败，请重试");
      },
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="w-full space-y-6 min-h-[50vh] bg-base-100">
      {/* 集合网格 */}
      {collections.length === 0
        ? (
            <EmptyState type="collections" isPublic={isPublic} />
          )
        : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection: any) => (
                <ResourceCollectionCard
                  key={collection.collectionListId || collection.id}
                  collectionList={collection}
                  onClick={handleCollectionClick}
                />
              ))}
            </div>
          )}

      {/* 分页 */}
      <Pagination
        currentPage={pageNo}
        totalItems={collections.length}
        pageSize={pageSize}
        onPageChange={setPageNo}
        showBottomMessage={true}
      />

      {/* 收藏列表详情弹窗 */}
      <CollectionListDetail
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        collectionList={selectedCollection || undefined}
        isLoading={false}
        onEdit={handleEditCollection}
        onDelete={handleDeleteCollection}
        onRemoveResource={handleRemoveResource}
      />
    </div>
  );
}
