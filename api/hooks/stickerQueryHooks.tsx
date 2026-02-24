import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {StickerCreateRequest} from "../models/StickerCreateRequest";

/**
 * 创建表情包
 */
export function useCreateStickerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: StickerCreateRequest) => tuanchat.stickerController.createSticker(req),
        mutationKey: ['createSticker'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserStickers'] });
        }
    });
}

/**
 * 删除表情包
 */
export function useDeleteStickerMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (stickerId: number) => tuanchat.stickerController.deleteSticker(stickerId),
        mutationKey: ['deleteSticker'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserStickers'] });
        }
    });
}

/**
 * 获取用户表情包列表
 */
export function useGetUserStickersQuery() {
    return useQuery({
        queryKey: ['getUserStickers'],
        queryFn: () => tuanchat.stickerController.getUserStickers(),
        staleTime: 300000 // 5分钟缓存
    });
}
