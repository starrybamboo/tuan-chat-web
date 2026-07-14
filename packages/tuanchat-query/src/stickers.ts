import type { ApiResultListSticker } from "@tuanchat/openapi-client/models/ApiResultListSticker";
import type { ApiResultLong } from "@tuanchat/openapi-client/models/ApiResultLong";
import type { ApiResultVoid } from "@tuanchat/openapi-client/models/ApiResultVoid";
import type { StickerCreateRequest } from "@tuanchat/openapi-client/models/StickerCreateRequest";
import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";
import type { QueryClient } from "@tanstack/react-query";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assertOpenApiResultSuccess } from "@tuanchat/domain/open-api-result";

import {
  beginOptimisticQueryTransaction,
  optimisticQueryPatch,
  rollbackOptimisticQueryTransaction,
} from "./optimistic-cache";

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

export function createOptimisticSticker(request: StickerCreateRequest): Sticker {
  return {
    ...request,
    stickerId: -request.fileId,
  };
}

export function addStickerToCacheData(current: ApiResultListSticker | undefined, sticker: Sticker) {
  if (!current?.data || current.data.some(item => item.stickerId === sticker.stickerId)) {
    return current;
  }
  return { ...current, data: [...current.data, sticker] };
}

export function removeStickerFromCacheData(current: ApiResultListSticker | undefined, stickerId: number) {
  if (!current?.data) {
    return current;
  }
  const data = current.data.filter(sticker => sticker.stickerId !== stickerId);
  return data.length === current.data.length ? current : { ...current, data };
}

export function beginCreateStickerOptimisticMutation(queryClient: QueryClient, request: StickerCreateRequest) {
  const optimisticSticker = createOptimisticSticker(request);
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListSticker>({
      queryKey: getUserStickersQueryKey(),
      update: current => addStickerToCacheData(current, optimisticSticker),
    }),
  ]);
}

export function commitCreatedSticker(queryClient: QueryClient, request: StickerCreateRequest, stickerId?: number) {
  if (!stickerId) {
    return;
  }
  const optimisticId = -request.fileId;
  queryClient.setQueryData<ApiResultListSticker>(getUserStickersQueryKey(), (current) => {
    if (!current?.data) {
      return current;
    }
    return {
      ...current,
      data: current.data.map(sticker => sticker.stickerId === optimisticId
        ? { ...sticker, stickerId }
        : sticker),
    };
  });
}

export function beginDeleteStickerOptimisticMutation(queryClient: QueryClient, stickerId: number) {
  return beginOptimisticQueryTransaction(queryClient, [
    optimisticQueryPatch<ApiResultListSticker>({
      queryKey: getUserStickersQueryKey(),
      update: current => removeStickerFromCacheData(current, stickerId),
    }),
  ]);
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
    onMutate: request => beginCreateStickerOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSuccess: (result, request) => commitCreatedSticker(queryClient, request, result.data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() }),
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
    onMutate: stickerId => beginDeleteStickerOptimisticMutation(queryClient, stickerId),
    onError: (_error, _stickerId, transaction) => rollbackOptimisticQueryTransaction(queryClient, transaction),
    onSettled: () => queryClient.invalidateQueries({ queryKey: getUserStickersQueryKey() }),
  });
}
