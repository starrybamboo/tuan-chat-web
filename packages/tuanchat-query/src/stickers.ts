import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResultListSticker } from "@tuanchat/openapi-client/models/ApiResultListSticker";
import type { ApiResultLong } from "@tuanchat/openapi-client/models/ApiResultLong";
import type { ApiResultVoid } from "@tuanchat/openapi-client/models/ApiResultVoid";
import type { StickerCreateRequest } from "@tuanchat/openapi-client/models/StickerCreateRequest";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { assertOpenApiResultSuccess } from "@tuanchat/domain/open-api-result";

type StickerClient = Pick<TuanChat, "stickerController">;

export function getUserStickersQueryKey() {
  return ["getUserStickers"] as const;
}

/** 校验表情接口业务响应，避免 HTTP 200 但 success=false 时被当成成功。 */
export function assertStickerApiResult<T extends ApiResultListSticker | ApiResultLong | ApiResultVoid>(
  result: T,
  fallback: string,
) {
  return assertOpenApiResultSuccess(result, fallback, "表情包接口返回了无效响应") as T;
}

export function useUserStickersQuery(
  client: StickerClient,
  options: { enabled?: boolean; staleTime?: number } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const result = await client.stickerController.getUserStickers();
      return assertStickerApiResult(result, "获取表情包列表失败。");
    },
    queryKey: getUserStickersQueryKey(),
    staleTime: options.staleTime ?? 300_000,
  });
}

export function useCreateStickerMutation(client: StickerClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: StickerCreateRequest) => {
      const result = await client.stickerController.createSticker(request);
      return assertStickerApiResult(result, "创建表情包失败。");
    },
    mutationKey: ["createSticker"],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() });
    },
  });
}

export function useDeleteStickerMutation(client: StickerClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stickerId: number) => {
      const result = await client.stickerController.deleteSticker(stickerId);
      return assertStickerApiResult(result, "删除表情包失败。");
    },
    mutationKey: ["deleteSticker"],
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() });
    },
  });
}
