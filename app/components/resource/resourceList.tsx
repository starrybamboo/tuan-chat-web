import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useDeleteResourceMutation,
  useGetPublicResourcesByTypeQuery,
  useGetUserResourcesByTypeQuery,
} from "../../../api/hooks/resourceQueryHooks";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { Pagination } from "./Pagination";
import { ResourceCard } from "./ResourceCard";

interface ResourceListProps {
  type: "5" | "6"; // 5: 图片, 6: 音频
  isPublic: boolean;
  searchText?: string;
  sortBy?: string;
}

export function ResourceList({ type, isPublic, searchText: _searchText = "", sortBy: _sortBy = "latest" }: ResourceListProps) {
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
    // 使用toast来处理确认，更现代的方式
    toast(t => (
      <div className="flex flex-col gap-2">
        <span>确定要删除这个资源吗？</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteResourceMutation.mutateAsync(resourceId);
                toast.success("删除成功");
                // 删除成功后不需要手动refetch，mutation已经配置了乐观更新和缓存管理
              }
              catch (error) {
                console.error("删除失败:", error);
                toast.error("删除失败，请重试");
              }
            }}
            className="btn btn-error btn-xs"
          >
            确定
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="btn btn-ghost btn-xs"
          >
            取消
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
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
