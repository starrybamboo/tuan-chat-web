import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { tuanchat } from "../instance";
import type { Collection } from "../models/Collection";
import type { CollectionAddRequest } from "../models/CollectionAddRequest";
import type { CollectionCheckRequest } from "../models/CollectionCheckRequest";
import type { CollectionPageRequest } from "../models/CollectionPageRequest";
import type { PageBaseRequest } from "../models/PageBaseRequest";
import type { CollectionList } from "../models/CollectionList";
import type { CollectionListAddRequest } from "../models/CollectionListAddRequest";
import type { CollectionListItemAddRequest } from "../models/CollectionListItemAddRequest";
import type { CollectionListItemBatchAddRequest } from "../models/CollectionListItemBatchAddRequest";
import type { CollectionListItemPageRequest } from "../models/CollectionListItemPageRequest";
import type { CollectionListItemRemoveRequest } from "../models/CollectionListItemRemoveRequest";
import type {CollectionListUpdateRequest} from "../models/CollectionListUpdateRequest";
// import type { CollectionTagAddRequest } from "../models/CollectionTagAddRequest";
// import type { CollectionTagDeleteRequest } from "../models/CollectionTagDeleteRequest";

// ==================== CollectionControllerService ====================

/**
 * 获取收藏信息
 * @param id 收藏ID
 */
function useGetCollectionQuery(id: number) {
    return useQuery({
        queryKey: ['getCollection', id],
        queryFn: () => tuanchat.collectionController.getCollection(id),
        staleTime: 300000, // 5分钟缓存
        enabled: id > 0
    });
}


/**
 * 获取收藏数量
 * @param resourceId 资源ID
 * @param resourceType 资源类型
 */
export function useGetCollectionCountQuery(resourceId: number, resourceType: string) {
    return useQuery({
        queryKey: ['getCollectionCount', { resourceId, resourceType }],
        queryFn: () => tuanchat.collectionController.getCollectionCount(
            resourceId,
            resourceType
        ),
        staleTime: 300000, // 5分钟缓存
        enabled: !!resourceId && !!resourceType
    });
}

/**
 * 更新收藏
 */
function useUpdateCollectionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: Collection) => tuanchat.collectionController.updateCollection(req),
        mutationKey: ['updateCollection'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getCollection', variables.collectionId] });
        }
    });
}

/**
 * 创建收藏
 */
export function useAddCollectionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionAddRequest) => tuanchat.collectionController.addCollection(req),
        mutationKey: ['addCollection'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserCollections'] });
            queryClient.invalidateQueries({queryKey: ['getCollectionCount']});
            queryClient.invalidateQueries({queryKey:['checkUserCollection']});
        }
    });
}

/**
 * 删除收藏
 */
export function useDeleteCollectionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => tuanchat.collectionController.deleteCollection(id),
        mutationKey: ['deleteCollection'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserCollections'] });
            queryClient.invalidateQueries({ queryKey: ['getCollectionCount'] });
            queryClient.invalidateQueries({queryKey:['checkUserCollection']});
        }
    });
}

/**
 * 获取当前用户收藏
 */
function useGetUserCollectionsQuery(requestBody: CollectionPageRequest) {
    return useQuery({
        queryKey: ['getUserCollections', requestBody],
        queryFn: () => tuanchat.collectionController.getUserCollections(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 分页查询收藏
 */
function useGetCollectionPageQuery(requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['getCollectionPage', requestBody],
        queryFn: () => tuanchat.collectionController.getCollectionPage(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 检查用户是否已收藏资源
 */
export function useCheckUserCollectionQuery(targetInfo: CollectionCheckRequest) {
    return useQuery({
        queryKey: ['checkUserCollection', targetInfo],
        queryFn: () => tuanchat.collectionController.checkUserCollection(targetInfo),
    });
}
// ==================== CollectionListControllerService ====================

/**
 * 获取收藏列表详情
 * @param collectionListId 收藏列表ID
 */
export function useGetCollectionListQuery(collectionListId: number) {
    return useQuery({
        queryKey: ['getCollectionList', collectionListId],
        queryFn: () => tuanchat.collectionListController.getCollectionList(collectionListId),
        staleTime: 300000, // 5分钟缓存
        enabled: collectionListId > 0
    });
}

/**
 * 更新收藏列表
 */
export function useUpdateCollectionListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListUpdateRequest) => tuanchat.collectionListController.updateCollectionList(req),
        mutationKey: ['updateCollectionList'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ 
                queryKey: ['getCollectionList', variables.collectionListId],
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ['getUserCollectionLists'],
                refetchType: 'active' 
            });
            // 如果是公开收藏列表，也更新公开列表缓存
            if (variables.isPublic) {
                queryClient.invalidateQueries({ 
                    queryKey: ['userResourceCollections'],
                    refetchType: 'active' 
                });
                queryClient.invalidateQueries({ 
                    queryKey: ['publicResourceCollections'],
                    refetchType: 'active' 
                });
            }
        },
        // 添加乐观更新
        onMutate: async (updatedCollection) => {
            await queryClient.cancelQueries({ queryKey: ['getUserCollectionLists'] });
            
            const previousCollections = queryClient.getQueryData(['getUserCollectionLists']);
            
            // 乐观更新集合列表
            queryClient.setQueryData(['getUserCollectionLists'], (old: any) => {
                if (!old?.data?.list) return old;
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: old.data.list.map((collection: any) => 
                            collection.collectionListId === updatedCollection.collectionListId
                                ? { ...collection, ...updatedCollection }
                                : collection
                        )
                    }
                };
            });
            
            return { previousCollections };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousCollections) {
                queryClient.setQueryData(['getUserCollectionLists'], context.previousCollections);
            }
        },
    });
}

/**
 * 创建收藏列表
 */
export function useCreateCollectionListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListAddRequest) => tuanchat.collectionListController.createCollectionList(req),
        mutationKey: ['createCollectionList'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserCollectionLists'] });
        }
    });
}

/**
 * 删除收藏列表
 */
export function useDeleteCollectionListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (collectionListId: number) => tuanchat.collectionListController.deleteCollectionList(collectionListId),
        mutationKey: ['deleteCollectionList'],
        onSuccess: (_, deletedCollectionListId) => {
            queryClient.invalidateQueries({ 
                queryKey: ['getUserCollectionLists'],
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ['userResourceCollections'],
                refetchType: 'active' 
            });
            queryClient.invalidateQueries({ 
                queryKey: ['publicResourceCollections'],
                refetchType: 'active' 
            });
            // 移除特定收藏列表的缓存
            queryClient.removeQueries({ 
                queryKey: ['getCollectionList', deletedCollectionListId] 
            });
        },
        // 添加乐观更新
        onMutate: async (deletedCollectionListId) => {
            await queryClient.cancelQueries({ queryKey: ['getUserCollectionLists'] });
            await queryClient.cancelQueries({ queryKey: ['userResourceCollections'] });
            await queryClient.cancelQueries({ queryKey: ['publicResourceCollections'] });
            
            const previousUserCollectionLists = queryClient.getQueryData(['getUserCollectionLists']);
            const previousUserResourceCollections = queryClient.getQueryData(['userResourceCollections']);
            const previousPublicResourceCollections = queryClient.getQueryData(['publicResourceCollections']);
            
            // 乐观删除 - 从所有相关列表中移除收藏列表
            const removeFromList = (old: any) => {
                if (!old?.data?.list) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: old.data.list.filter((collection: any) => 
                            collection.collectionListId !== deletedCollectionListId
                        )
                    }
                };
            };
            
            queryClient.setQueryData(['getUserCollectionLists'], removeFromList);
            queryClient.setQueryData(['userResourceCollections'], removeFromList);
            queryClient.setQueryData(['publicResourceCollections'], removeFromList);
            
            return { 
                previousUserCollectionLists, 
                previousUserResourceCollections,
                previousPublicResourceCollections 
            };
        },
        onError: (_err, _deletedCollectionListId, context) => {
            // 发生错误时回滚所有相关缓存
            if (context?.previousUserCollectionLists) {
                queryClient.setQueryData(['getUserCollectionLists'], context.previousUserCollectionLists);
            }
            if (context?.previousUserResourceCollections) {
                queryClient.setQueryData(['userResourceCollections'], context.previousUserResourceCollections);
            }
            if (context?.previousPublicResourceCollections) {
                queryClient.setQueryData(['publicResourceCollections'], context.previousPublicResourceCollections);
            }
        },
    });
}

/**
 * 获取用户的收藏列表
 */
export function useGetUserCollectionListsQuery(requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['getUserCollectionLists', requestBody],
        queryFn: () => tuanchat.collectionListController.getUserCollectionLists(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 获取热门公开收藏列表
 */
// export function useGetPopularCollectionListsQuery(requestBody: PageBaseRequest) {
//     return useQuery({
//         queryKey: ['getPopularCollectionLists', requestBody],
//         queryFn: () => tuanchat.collectionListController.getPopularCollectionLists(requestBody),
//         staleTime: 300000 // 5分钟缓存
//     });
// }

// ==================== CollectionListItemControllerService ====================

/**
 * 获取列表中的收藏
 */
export function useGetListCollectionsQuery(requestBody: CollectionListItemPageRequest) {
    return useInfiniteQuery({
        queryKey: ['getListCollections', requestBody],
        queryFn: ({ pageParam }) => {
            const params = { ...requestBody, pageNo: pageParam };
            return tuanchat.collectionListItemController.getListCollections(params);
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage.data?.isLast) {
                return allPages.length + 1;
            }
            return undefined;
        },
        staleTime: 30000 // 30秒缓存
    });
}

/**
 * 批量添加收藏到列表
 */
function useBatchAddToListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListItemBatchAddRequest) => tuanchat.collectionListItemController.batchAddToList(req),
        mutationKey: ['batchAddToList'],
        onSuccess: (_, variables) => {
            // 更新收藏列表中的资源
            queryClient.invalidateQueries({ 
                queryKey: ['resourcesInCollection', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
                queryKey: ['getListCollections', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
        },
        // 添加乐观更新
        onMutate: async (variables) => {
            const queryKey = ['resourcesInCollection', { collectionListId: variables.collectionListId }];
            
            await queryClient.cancelQueries({ queryKey });
            
            const previousData = queryClient.getQueryData(queryKey);
            
            // 乐观更新 - 添加新的收藏项
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.data?.list) return old;
                
                // 创建临时的收藏项
                const tempCollections = variables.collectionIds.map(id => ({
                    collectionId: id,
                    resourceId: Date.now() + Math.random(), // 临时ID
                    name: "正在添加...",
                    createTime: new Date().toISOString(),
                    isAdding: true
                }));
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: [...tempCollections, ...old.data.list]
                    }
                };
            });
            
            return { previousData, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData && context?.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }
        },
    });
}

/**
 * 添加收藏到列表
 */
export function useAddToListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListItemAddRequest) => tuanchat.collectionListItemController.addToList(req),
        mutationKey: ['addToList'],
        onSuccess: (_, variables) => {
            // 更新收藏列表中的资源
            queryClient.invalidateQueries({ 
                queryKey: ['resourcesInCollection', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
            queryClient.invalidateQueries({ 
                queryKey: ['getListCollections', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
        },
        // 添加乐观更新
        onMutate: async (variables) => {
            const queryKey = ['resourcesInCollection', { collectionListId: variables.collectionListId }];
            
            await queryClient.cancelQueries({ queryKey });
            
            const previousData = queryClient.getQueryData(queryKey);
            
            // 乐观更新 - 添加新的收藏项
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.data?.list) return old;
                
                const tempCollection = {
                    collectionId: variables.collectionId,
                    resourceId: Date.now(), // 临时ID
                    name: "正在添加...",
                    createTime: new Date().toISOString(),
                    isAdding: true
                };
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: [tempCollection, ...old.data.list]
                    }
                };
            });
            
            return { previousData, queryKey };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData && context?.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousData);
            }
        },
    });
}

/**
 * 从列表中移除收藏
 */
export function useRemoveFromListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListItemRemoveRequest) => tuanchat.collectionListItemController.removeFromList(req),
        mutationKey: ['removeFromList'],
        onSuccess: (_, variables) => {
            // 更新收藏列表详情中的资源列表
            queryClient.invalidateQueries({ 
                queryKey: ['resourcesInCollection', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
            // 更新收藏列表查询
            queryClient.invalidateQueries({ 
                queryKey: ['getListCollections', { collectionListId: variables.collectionListId }],
                refetchType: 'active'
            });
        },
        // 添加乐观更新
        onMutate: async (variables) => {
            const queryKey = ['resourcesInCollection', { collectionListId: variables.collectionListId }];
            
            // 取消相关查询
            await queryClient.cancelQueries({ queryKey });
            
            // 保存当前状态
            const previousResourcesData = queryClient.getQueryData(queryKey);
            
            // 乐观更新 - 立即从列表中移除资源
            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old?.data?.list) return old;
                
                return {
                    ...old,
                    data: {
                        ...old.data,
                        list: old.data.list.filter((resource: any) => 
                            resource.collectionId !== variables.collectionId
                        )
                    }
                };
            });
            
            return { previousResourcesData, queryKey };
        },
        onError: (_err, _variables, context) => {
            // 发生错误时回滚
            if (context?.previousResourcesData && context?.queryKey) {
                queryClient.setQueryData(context.queryKey, context.previousResourcesData);
            }
        },
    });
}

// ==================== CollectionTagControllerService ====================

// /**
//  * 获取收藏的标签
//  * @param collectionId 收藏ID
//  */
// export function useGetCollectionTagsQuery(collectionId: number) {
//     return useQuery({
//         queryKey: ['getCollectionTags', collectionId],
//         queryFn: () => tuanchat.collectionTagController.getCollectionTags(collectionId),
//         staleTime: 300000, // 5分钟缓存
//         enabled: collectionId > 0
//     });
// }

/**
 * 为收藏添加标签
 */
// export function useAddCollectionTagMutation() {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: (req: CollectionTagAddRequest) => tuanchat.collectionTagController.addCollectionTag(req),
//         mutationKey: ['addCollectionTag'],
//         onSuccess: (_, variables) => {
//             queryClient.invalidateQueries({ queryKey: ['getCollectionTags', variables.collectionId] });
//             queryClient.invalidateQueries({ queryKey: ['getUserTags'] });
//         }
//     });
// }

/**
 * 删除收藏标签
 */
// export function useDeleteCollectionTagMutation() {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: (req: CollectionTagDeleteRequest) => tuanchat.collectionTagController.deleteCollectionTag(req),
//         mutationKey: ['deleteCollectionTag'],
//         onSuccess: (_, variables) => {
//             queryClient.invalidateQueries({ queryKey: ['getCollectionTags', variables.collectionId] });
//             queryClient.invalidateQueries({ queryKey: ['getUserTags'] });
//         }
//     });
// }

/**
 * 获取用户所有标签
 */
// export function useGetUserTagsQuery() {
//     return useQuery({
//         queryKey: ['getUserTags'],
//         queryFn: () => tuanchat.collectionTagController.getUserTags(),
//         staleTime: 300000 // 5分钟缓存
//     });
// }

