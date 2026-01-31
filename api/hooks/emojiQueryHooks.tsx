import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {tuanchat} from "../instance";
import type {EmojiCreateRequest} from "../models/EmojiCreateRequest";

/**
 * 鏍规嵁ID鑾峰彇琛ㄦ儏鍖?
 * @param emojiId 琛ㄦ儏鍖匢D
 */

/**
 * 鍒涘缓琛ㄦ儏鍖?
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
 * 鍒犻櫎琛ㄦ儏鍖?
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
 * 鑾峰彇鐢ㄦ埛琛ㄦ儏鍖呭垪琛?
 */
export function useGetUserEmojisQuery() {
    return useQuery({
        queryKey: ['getUserEmojis'],
        queryFn: () => tuanchat.emojiController.getUserEmojis(),
        staleTime: 300000 // 5鍒嗛挓缂撳瓨
    });
}
