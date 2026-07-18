import {
    useCreateStickerMutation as useSharedCreateStickerMutation,
    useDeleteStickerMutation as useSharedDeleteStickerMutation,
    useUserStickersQuery,
} from "@tuanchat/query/stickers";

import {tuanchat} from "../instance";

/**
 * 创建表情包
 */
export function useCreateStickerMutation() {
    return useSharedCreateStickerMutation(tuanchat);
}

/**
 * 删除表情包
 */
export function useDeleteStickerMutation() {
    return useSharedDeleteStickerMutation(tuanchat);
}

/**
 * 获取用户表情包列表
 */
export function useGetUserStickersQuery() {
    return useUserStickersQuery(tuanchat, { staleTime: 300_000 });
}
