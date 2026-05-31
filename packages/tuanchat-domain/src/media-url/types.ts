export type MediaQuality = "original" | "low" | "medium" | "high";
export type LegacyMediaQuality = Extract<MediaQuality, "high">;
export type MediaQualityInput = MediaQuality;
export type MediaType = "image" | "audio" | "video" | "document" | "other";
