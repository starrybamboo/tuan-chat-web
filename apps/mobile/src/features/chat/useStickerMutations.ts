import { mobileApiClient } from "@/lib/api";
import { useCreateStickerMutation as useSharedCreateStickerMutation } from "@tuanchat/query/stickers";

export function useCreateStickerMutation() {
  return useSharedCreateStickerMutation(mobileApiClient);
}
