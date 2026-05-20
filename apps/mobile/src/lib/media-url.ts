export {
  avatarThumbUrl,
  mediaFileUrl,
  mediaShard,
  normalizeMediaType,
} from "@tuanchat/domain/media-url";

export type { MediaQuality, MediaQualityInput, MediaType } from "@tuanchat/domain/media-url";

/** @deprecated Use MediaQuality from @tuanchat/domain/media-url */
export type MobileMediaQuality = import("@tuanchat/domain/media-url").MediaQualityInput;
/** @deprecated Use MediaType from @tuanchat/domain/media-url */
export type MobileMediaType = import("@tuanchat/domain/media-url").MediaType;
