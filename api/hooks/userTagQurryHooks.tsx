import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TagGetRequest } from "../models/TagGetRequest";
import type { TagAddRequest } from "../models/TagAddRequest";
import type { TagUpdateRequest } from "../models/TagUpdateRequest";
import type { TagDeleteRequest } from "../models/TagDeleteRequest";
import type { TagUsageRequest } from "../models/TagUsageRequest";
import { tuanchat } from "../instance"; // 假设你们也有类似的实例

/**
 * 获取单个标签信息
 */
export function useGetTagQuery(id: number) {
    return useQuery({
        queryKey: ["getTag", id],
        queryFn: () => tuanchat.tagController.getTag(id),
        staleTime: 10000,
        enabled: id > 0,
    });
}

/**
 * 根据类型和id获取标签列表
 */
export function useGetTagsQuery(request: TagGetRequest) {
    return useQuery({
        queryKey: ["getTags", request],
        queryFn: () => tuanchat.tagController.getTags(request),
        staleTime: 10000,
        enabled: !!request, // 确保request存在时才启用查询
    });
}

/**
 * 获取标签使用次数
 */
export function useGetTagUsageCountQuery(request: TagUsageRequest) {
    return useQuery({
        queryKey: ["getTagUsageCount", request],
        queryFn: () => tuanchat.tagController.getTagUsageCount(request),
        staleTime: 30000, // 使用次数变化不频繁，可以设置更长的缓存时间
        enabled: !!request,
    });
}

/**
 * 创建标签
 */
export function useAddTagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: TagAddRequest) => tuanchat.tagController.addTag(req),
        mutationKey: ["addTag"],
        onSuccess: (_, variables) => {
            // 刷新相关的查询缓存
            queryClient.invalidateQueries({ queryKey: ["getTags"] });
            // 如果有特定的标签类型，可以更精确地刷新
            // queryClient.invalidateQueries({ queryKey: ["getTags", { type: variables.type }] });
        },
    });
}

/**
 * 更新标签
 */
export function useUpdateTagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: TagUpdateRequest) => tuanchat.tagController.updateTag(req),
        mutationKey: ["updateTag"],
        onSuccess: (_, variables) => {
            // 刷新标签列表和单个标签的缓存
            queryClient.invalidateQueries({ queryKey: ["getTags"] });
            queryClient.invalidateQueries({ queryKey: ["getTag", variables.tagId] });
        },
    });
}

/**
 * 删除标签
 */
export function useDeleteTagMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: TagDeleteRequest) => tuanchat.tagController.deleteTag(req),
        mutationKey: ["deleteTag"],
        onSuccess: (_, variables) => {
            // 刷新标签列表缓存
            queryClient.invalidateQueries({ queryKey: ["getTags"] });
            // 移除被删除标签的缓存
            queryClient.removeQueries({ queryKey: ["getTag", variables.tagId] });
            // 刷新使用次数相关的缓存
            queryClient.invalidateQueries({ queryKey: ["getTagUsageCount"] });
        },
    });
}

