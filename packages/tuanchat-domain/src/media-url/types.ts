export type MediaQuality = "original" | "low" | "medium";
/** @deprecated Use MediaQuality instead. "high" is mapped to "medium" internally. */
export type LegacyMediaQuality = "high";
export type MediaQualityInput = MediaQuality | LegacyMediaQuality;
export type MediaType = "image" | "audio" | "video" | "document" | "other";
