import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * 资源页面状态管理hook
 * 提供优化的数据刷新和状态管理功能
 */
export function useResourcePageState() {
  const queryClient = useQueryClient();

  /**
   * 处理上传成功后的状态更新
   * 不使用强制刷新，依赖React Query的自动缓存管理
   */
  const handleUploadSuccess = useCallback(() => {
    // 上传mutation已经配置了乐观更新和缓存管理
    // 这里不需要额外的操作
  }, []);

  /**
   * 处理创建收藏集成功后的状态更新
   */
  const handleCreateCollectionSuccess = useCallback(() => {
    // 创建collection mutation已经配置了乐观更新和缓存管理
    // 这里不需要额外的操作
  }, []);

  /**
   * 手动刷新特定类型的资源数据
   * 只在特殊情况下使用，一般情况下依赖自动缓存管理
   */
  const refreshResourceData = useCallback((type: "5" | "6", isPublic: boolean) => {
    const queryKey = isPublic ? "publicResources" : "userResources";
    queryClient.invalidateQueries({
      queryKey: [queryKey, { type }],
      refetchType: "active",
    });
  }, [queryClient]);

  /**
   * 手动刷新特定类型的收藏集数据
   */
  const refreshCollectionData = useCallback((type: "5" | "6", isPublic: boolean) => {
    const queryKey = isPublic ? "publicResourceCollections" : "userResourceCollections";
    queryClient.invalidateQueries({
      queryKey: [queryKey, { type }],
      refetchType: "active",
    });
  }, [queryClient]);

  return {
    handleUploadSuccess,
    handleCreateCollectionSuccess,
    refreshResourceData,
    refreshCollectionData,
  };
}
