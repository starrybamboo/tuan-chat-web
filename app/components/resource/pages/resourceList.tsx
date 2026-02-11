import { ApiError } from "api";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useDeleteResourceMutation,
  useGetPublicResourcesByTypeQuery,
  useGetUserResourcesByTypeQuery,
} from "../../../../api/hooks/resourceQueryHooks";
import { ResourceCard } from "../cards/ResourceCard";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../ui/LoadingState";
import { Pagination } from "../ui/Pagination";

interface ResourceListProps {
  type: "5" | "6"; // 5: ͼƬ, 6: 音频
  isPublic: boolean;
  searchText?: string;
  sortBy?: string;
  canEdit?: boolean;
}

export function ResourceList({ type, isPublic, searchText: _searchText = "", sortBy: _sortBy = "latest", canEdit }: ResourceListProps) {
  const [pageNo, setPageNo] = useState(1);
  const [pageSize] = useState(20);

  // 获取资源列表
  const publicQuery = useGetPublicResourcesByTypeQuery(
    { type, pageNo, pageSize },
    { enabled: isPublic },
  );
  const userQuery = useGetUserResourcesByTypeQuery(
    { type, pageNo, pageSize },
    { enabled: !isPublic },
  );

  const { data: resourcesData, isLoading } = isPublic ? publicQuery : userQuery;

  const deleteResourceMutation = useDeleteResourceMutation();

  const resources = resourcesData?.data?.list || [];

  const handleDelete = async (resourceId: number) => {
    try {
      await deleteResourceMutation.mutateAsync(resourceId);
      toast.success("删除成功");
      // 删除成功后不需要手动refetch，mutation已经配置了乐观更新和缓存管理
    }
    catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.body?.errMsg || "删除失败，请重试");
      }
      else {
        toast.error("删除失败，请重试");
      }
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="w-full space-y-6 min-h-[50vh] bg-base-100">
      {/* 资源网格 */}
      {resources.length === 0
        ? (
            <EmptyState type="resources" isPublic={isPublic} />
          )
        : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {resources.map((resource: any) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  type={type}
                  isPublic={isPublic}
                  onDelete={!isPublic ? handleDelete : undefined}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}

      {/* 分页 */}
      <Pagination
        currentPage={pageNo}
        totalItems={resources.length}
        pageSize={pageSize}
        onPageChange={setPageNo}
        showBottomMessage={true}
      />
    </div>
  );
}
