import { useCreateStickerMutation as useSharedCreateStickerMutation } from "@tuanchat/query/stickers";

import { mobileApiClient } from "@/lib/api";

export function useCreateStickerMutation() {
  return useSharedCreateStickerMutation(mobileApiClient);
}
