import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResourceUpdateRequest } from "../models/ResourceUpdateRequest";
import type { ResourcePageRequest } from "../models/ResourcePageRequest";
import type { ResourceUploadRequest } from "../models/ResourceUploadRequest";
import type { CollectionResourcePageRequest } from "../models/CollectionResourcePageRequest";
import type { ResourceBatchAddToCollectionRequest } from "../models/ResourceBatchAddToCollectionRequest";
import type { ResourceCollectionCreateRequest } from "../models/ResourceCollectionCreateRequest";
import { tuanchat } from "../instance";

/**
 * 更新资源
 */
export function useUpdateResourceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ResourceUpdateRequest) => tuanchat.resourceController.updateResource(req),
        mutationKey: ["updateResource"],
        onSuccess: (data, variables) => {
            // 更精确的缓存更新 - 更新特定资源的缓存
            queryClient.invalidateQueries({ 
                queryKey: ["userResources"], 
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ["publicResources"], 
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ["resourceDetail", variables.resourceId] 
            });
        },
    });
}

/**
 * 获取当前用户的资源（按类型）
 */
export function useGetUserResourcesByTypeQuery(request: ResourcePageRequest, p0: {
    enabled: boolean;
}) {
    return useQuery({
        queryKey: ["userResources", request],
        queryFn: () => tuanchat.resourceController.getUserResourcesByType(request),
        staleTime: 10000,
    });
}

/**
 * 上传资源
 */
export function useUploadResourceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ResourceUploadRequest) => tuanchat.resourceController.uploadResource(req),
        mutationKey: ["uploadResource"],
        onSuccess: (data, variables) => {
            // 根据上传的资源类型和公开性，精确更新相关缓存
            if (variables.isPublic) {
                queryClient.invalidateQueries({ 
                    queryKey: ["publicResources"],
                    refetchType: 'active'
                });
            }
            queryClient.invalidateQueries({ 
                queryKey: ["userResources"],
                refetchType: 'active' 
            });
        },
        // 添加乐观更新
        onMutate: async (newResource) => {
            // 取消相关的查询以避免竞态条件
            await queryClient.cancelQueries({ queryKey: ["userResources"] });
            
            // 获取当前缓存数据的快照
            const previousUserResources = queryClient.getQueryData(["userResources"]);
            
            // 乐观更新 - 添加新资源到列表顶部
            queryClient.setQueryData(["userResources"], (old: any) => {
                if (!old?.data?.list) return old;
                
                const optimisticResource = {
                    resourceId: Date.now(), // 临时ID
                    name: newResource.name,
                    url: newResource.url,
                    type: newResource.type,
                    isPublic: newResource.isPublic,
                    createTime: new Date().toISOString(),
                    typeDescription: newResource.type === "5" ? "图片" : "音频",
                    isUploading: true // 标记为正在上传
                };
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: [optimisticResource, ...old.data.list]
                    }
                };
            });
            
            return { previousUserResources };
        },
        onError: (_err, _newResource, context) => {
            // 发生错误时回滚到之前的状态
            if (context?.previousUserResources) {
                queryClient.setQueryData(["userResources"], context.previousUserResources);
            }
        },
    });
}

/**
 * 获取资源集合中的资源
 */
export function useGetResourcesInCollectionQuery(request: CollectionResourcePageRequest) {
    return useQuery({
        queryKey: ["resourcesInCollection", request],
        queryFn: () => tuanchat.resourceController.getResourcesInCollection(request),
        staleTime: 10000,
    });
}

/**
 * 批量添加资源到集合
 */
export function useBatchAddResourcesToCollectionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ResourceBatchAddToCollectionRequest) => tuanchat.resourceController.batchAddResourcesToCollection(req),
        mutationKey: ["batchAddResourcesToCollection"],
        onSuccess: (data, variables) => {
            // 精确更新相关缓存
            queryClient.invalidateQueries({ 
                queryKey: ["userResources"],
                refetchType: 'active' 
            });
            // 更新收藏集中的资源列表
            queryClient.invalidateQueries({ 
                queryKey: ["resourcesInCollection", { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
            // 更新收藏集列表的资源数量
            queryClient.invalidateQueries({ 
                queryKey: ["userResourceCollections"],
                refetchType: 'active' 
            });
        },
        // 添加乐观更新
        onMutate: async (variables) => {
            const resourcesInCollectionKey = ["resourcesInCollection", { collectionListId: variables.collectionListId }];
            
            // 取消相关查询
            await queryClient.cancelQueries({ queryKey: resourcesInCollectionKey });
            
            // 保存当前状态
            const previousResourcesData = queryClient.getQueryData(resourcesInCollectionKey);
            
            // 乐观更新 - 假设我们有要添加的资源数据
            // 由于我们只有resourceIds，这里先简单添加占位符
            // 实际的资源数据会在服务器响应后正确显示
            queryClient.setQueryData(resourcesInCollectionKey, (old: any) => {
                if (!old?.data?.list) return old;
                
                // 创建临时的资源项
                const tempResources = variables.resourceIds.map(id => ({
                    resourceId: id,
                    name: "正在添加...",
                    type: variables.resourceType,
                    createTime: new Date().toISOString(),
                    isAdding: true // 标记为正在添加
                }));
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: [...tempResources, ...old.data.list]
                    }
                };
            });
            
            return { previousResourcesData, resourcesInCollectionKey };
        },
        onError: (_err, _variables, context) => {
            // 发生错误时回滚
            if (context?.previousResourcesData && context?.resourcesInCollectionKey) {
                queryClient.setQueryData(context.resourcesInCollectionKey, context.previousResourcesData);
            }
        },
    });
}

/**
 * 获取资源详情
 */
export function useGetResourceDetailQuery(resourceId: number) {
    return useQuery({
        queryKey: ["resourceDetail", resourceId],
        queryFn: () => tuanchat.resourceController.getResourceDetail(resourceId),
        enabled: resourceId > 0,
        staleTime: 10000,
    });
}

/**
 * 删除资源
 */
export function useDeleteResourceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (resourceId: number) => tuanchat.resourceController.deleteResource(resourceId),
        mutationKey: ["deleteResource"],
        onSuccess: (data, deletedResourceId) => {
            // 精确更新缓存，移除被删除的资源
            queryClient.invalidateQueries({ 
                queryKey: ["userResources"],
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ["publicResources"],
                refetchType: 'active' 
            });
            // 清除特定资源的详情缓存
            queryClient.removeQueries({ 
                queryKey: ["resourceDetail", deletedResourceId] 
            });
        },
        // 添加乐观更新
        onMutate: async (deletedResourceId) => {
            // 取消相关查询
            await queryClient.cancelQueries({ queryKey: ["userResources"] });
            await queryClient.cancelQueries({ queryKey: ["publicResources"] });
            
            // 保存当前状态
            const previousUserResources = queryClient.getQueryData(["userResources"]);
            const previousPublicResources = queryClient.getQueryData(["publicResources"]);
            
            // 乐观更新 - 从列表中移除资源
            const updateResourceList = (old: any) => {
                if (!old?.data?.list) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: old.data.list.filter((resource: any) => 
                            resource.resourceId !== deletedResourceId
                        )
                    }
                };
            };
            
            queryClient.setQueryData(["userResources"], updateResourceList);
            queryClient.setQueryData(["publicResources"], updateResourceList);
            
            return { previousUserResources, previousPublicResources };
        },
        onError: (_err, _deletedResourceId, context) => {
            // 发生错误时回滚
            if (context?.previousUserResources) {
                queryClient.setQueryData(["userResources"], context.previousUserResources);
            }
            if (context?.previousPublicResources) {
                queryClient.setQueryData(["publicResources"], context.previousPublicResources);
            }
        },
    });
}

/**
 * 获取公开资源（按类型）
 */
export function useGetPublicResourcesByTypeQuery(request: ResourcePageRequest, p0: {
    enabled: boolean;
}) {
    return useQuery({
        queryKey: ["publicResources", request],
        queryFn: () => tuanchat.resourceController.getPublicResourcesByType(request),
        staleTime: 10000,
    });
}

/**
 * 获取当前用户的资源集合（按类型）
 */
export function useGetUserResourceCollectionsByTypeQuery(request: ResourcePageRequest, p0: {
    enabled: boolean;
}) {
    return useQuery({
        queryKey: ["userResourceCollections", request],
        queryFn: () => tuanchat.resourceController.getUserResourceCollectionsByType(request),
        staleTime: 10000,
    });
}

/**
 * 获取公开资源集合（按类型）
 */
export function useGetPublicResourceCollectionsByTypeQuery(request: ResourcePageRequest, p0: {
    enabled: boolean;
}) {
    return useQuery({
        queryKey: ["publicResourceCollections", request],
        queryFn: () => tuanchat.resourceController.getPublicResourceCollectionsByType(request),
        staleTime: 10000,
    });
}

/**
 * 创建资源收藏集
 */
export function useCreateResourceCollectionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: ResourceCollectionCreateRequest) => tuanchat.resourceController.createResourceCollection(req),
        mutationKey: ["createResourceCollection"],
        onSuccess: (data, variables) => {
            // 根据创建的收藏集是否公开，精确更新相应缓存
            if (variables.isPublic) {
                queryClient.invalidateQueries({ 
                    queryKey: ["publicResourceCollections"],
                    refetchType: 'active' 
                });
            }
            queryClient.invalidateQueries({ 
                queryKey: ["userResourceCollections"],
                refetchType: 'active' 
            });
        },
        // 添加乐观更新
        onMutate: async (newCollection) => {
            await queryClient.cancelQueries({ queryKey: ["userResourceCollections"] });
            
            const previousUserCollections = queryClient.getQueryData(["userResourceCollections"]);
            
            // 乐观更新 - 添加新收藏集
            queryClient.setQueryData(["userResourceCollections"], (old: any) => {
                if (!old?.data?.list) return old;
                
                const optimisticCollection = {
                    collectionListId: Date.now(), // 临时ID
                    collectionListName: newCollection.collectionListName,
                    description: newCollection.description,
                    isPublic: newCollection.isPublic,
                    createTime: new Date().toISOString(),
                    coverImageUrl: newCollection.coverImageUrl,
                    isCreating: true // 标记为正在创建
                };
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: [optimisticCollection, ...old.data.list]
                    }
                };
            });
            
            return { previousUserCollections };
        },
        onError: (_err, _newCollection, context) => {
            if (context?.previousUserCollections) {
                queryClient.setQueryData(["userResourceCollections"], context.previousUserCollections);
            }
        },
    });
}