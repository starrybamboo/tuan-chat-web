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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userResources"] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userResources"] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userResources"] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userResources"] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["userResourceCollections"] });
            queryClient.invalidateQueries({ queryKey: ["publicResourceCollections"] });
        },
    });
}