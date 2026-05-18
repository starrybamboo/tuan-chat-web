import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StickerCreateRequest } from "@tuanchat/openapi-client/models/StickerCreateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type StickerClient = Pick<TuanChat, "stickerController">;

export function getUserStickersQueryKey() {
  return ["getUserStickers"] as const;
}

export function useUserStickersQuery(
  client: StickerClient,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => client.stickerController.getUserStickers(),
    queryKey: getUserStickersQueryKey(),
    staleTime: options.staleTime ?? 300_000,
  });
}

export function useCreateStickerMutation(client: StickerClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: StickerCreateRequest) => client.stickerController.createSticker(request),
    mutationKey: ["createSticker"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() });
    },
  });
}

export function useDeleteStickerMutation(client: StickerClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stickerId: number) => client.stickerController.deleteSticker(stickerId),
    mutationKey: ["deleteSticker"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() });
    },
  });
}
