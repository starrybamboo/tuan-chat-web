import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {EmojiCreateRequest} from "../models/EmojiCreateRequest";

/**
 * 根据 ID 获取表情
 * @param emojiId 表情包ID
 */

/**
 * 创建表情
 */
export function useCreateEmojiMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: EmojiCreateRequest) => tuanchat.emojiController.createEmoji(req),
        mutationKey: ['createEmoji'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserEmojis'] });
        }
    });
}

/**
 * 删除表情
 */
export function useDeleteEmojiMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (emojiId: number) => tuanchat.emojiController.deleteEmoji(emojiId),
        mutationKey: ['deleteEmoji'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getUserEmojis'] });
        }
    });
}

/**
 * 获取用户表情包列表
 */
export function useGetUserEmojisQuery() {
    return useQuery({
        queryKey: ['getUserEmojis'],
        queryFn: () => tuanchat.emojiController.getUserEmojis(),
        staleTime: 300000 // 5分钟缓存
    });
}
