import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {StickerCreateRequest} from "@tuanchat/openapi-client/models/StickerCreateRequest";
import {
    assertStickerApiResult,
    beginCreateStickerOptimisticMutation,
    beginDeleteStickerOptimisticMutation,
    commitCreatedSticker,
    getUserStickersQueryKey,
} from "@tuanchat/query/stickers";
import { rollbackOptimisticQueryTransaction } from "@tuanchat/query/optimistic-cache";

/**
 * 创建表情包
 */
export function useCreateStickerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (req: StickerCreateRequest) => assertStickerApiResult(
            await tuanchat.stickerController.createSticker(req),
            "创建表情包失败。",
        ),
        mutationKey: ['createSticker'],
        onMutate: request => beginCreateStickerOptimisticMutation(queryClient, request),
        onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
        onSuccess: (result, request) => commitCreatedSticker(queryClient, request, result.data),
        onSettled: () => queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() }),
    });
}

/**
 * 删除表情包
 */
export function useDeleteStickerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (stickerId: number) => assertStickerApiResult(
            await tuanchat.stickerController.deleteSticker(stickerId),
            "删除表情包失败。",
        ),
        mutationKey: ['deleteSticker'],
        onMutate: stickerId => beginDeleteStickerOptimisticMutation(queryClient, stickerId),
        onError: (_error, _stickerId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
        onSettled: () => queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() }),
    });
}

/**
 * 获取用户表情包列表
 */
export function useGetUserStickersQuery() {
    return useQuery({
        queryKey: getUserStickersQueryKey(),
        queryFn: async () => assertStickerApiResult(
            await tuanchat.stickerController.getUserStickers(),
            "获取表情包列表失败。",
        ),
        staleTime: 300000 // 5分钟缓存
    });
}
