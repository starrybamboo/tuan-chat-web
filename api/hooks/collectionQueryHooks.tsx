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
import type { CollectionTagAddRequest } from "../models/CollectionTagAddRequest";
import type { CollectionTagDeleteRequest } from "../models/CollectionTagDeleteRequest";

// ==================== CollectionControllerService ====================

/**
 * 获取收藏信息
 * @param id 收藏ID
 */
export function useGetCollectionQuery(id: number) {
    return useQuery({
        queryKey: ['getCollection', id],
        queryFn: () => tuanchat.collectionController.getCollection(id),
        staleTime: 300000, // 5分钟缓存
        enabled: id > 0
    });
}

/**
 * 更新收藏
 */
export function useUpdateCollectionMutation() {
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
        }
    });
}

/**
 * 获取当前用户收藏
 */
export function useGetUserCollectionsQuery(requestBody: CollectionPageRequest) {
    return useQuery({
        queryKey: ['getUserCollections', requestBody],
        queryFn: () => tuanchat.collectionController.getUserCollections(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

/**
 * 分页查询收藏
 */
export function useGetCollectionPageQuery(requestBody: PageBaseRequest) {
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
        mutationFn: (req: CollectionList) => tuanchat.collectionListController.updateCollectionList(req),
        mutationKey: ['updateCollectionList'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getCollectionList', variables.collectionListId] });
            queryClient.invalidateQueries({ queryKey: ['getUserCollectionLists'] });
        }
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserCollectionLists'] });
        }
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
export function useGetPopularCollectionListsQuery(requestBody: PageBaseRequest) {
    return useQuery({
        queryKey: ['getPopularCollectionLists', requestBody],
        queryFn: () => tuanchat.collectionListController.getPopularCollectionLists(requestBody),
        staleTime: 300000 // 5分钟缓存
    });
}

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
export function useBatchAddToListMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionListItemBatchAddRequest) => tuanchat.collectionListItemController.batchAddToList(req),
        mutationKey: ['batchAddToList'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getListCollections', { collectionListId: variables.collectionListId }] });
        }
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
            queryClient.invalidateQueries({ queryKey: ['getListCollections', { collectionListId: variables.collectionListId }] });
        }
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
            queryClient.invalidateQueries({ queryKey: ['getListCollections', { collectionListId: variables.collectionListId }] });
        }
    });
}

// ==================== CollectionTagControllerService ====================

/**
 * 获取收藏的标签
 * @param collectionId 收藏ID
 */
export function useGetCollectionTagsQuery(collectionId: number) {
    return useQuery({
        queryKey: ['getCollectionTags', collectionId],
        queryFn: () => tuanchat.collectionTagController.getCollectionTags(collectionId),
        staleTime: 300000, // 5分钟缓存
        enabled: collectionId > 0
    });
}

/**
 * 为收藏添加标签
 */
export function useAddCollectionTagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionTagAddRequest) => tuanchat.collectionTagController.addCollectionTag(req),
        mutationKey: ['addCollectionTag'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getCollectionTags', variables.collectionId] });
            queryClient.invalidateQueries({ queryKey: ['getUserTags'] });
        }
    });
}

/**
 * 删除收藏标签
 */
export function useDeleteCollectionTagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: CollectionTagDeleteRequest) => tuanchat.collectionTagController.deleteCollectionTag(req),
        mutationKey: ['deleteCollectionTag'],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['getCollectionTags', variables.collectionId] });
            queryClient.invalidateQueries({ queryKey: ['getUserTags'] });
        }
    });
}

/**
 * 获取用户所有标签
 */
export function useGetUserTagsQuery() {
    return useQuery({
        queryKey: ['getUserTags'],
        queryFn: () => tuanchat.collectionTagController.getUserTags(),
        staleTime: 300000 // 5分钟缓存
    });
}
