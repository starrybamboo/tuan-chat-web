import type {
  NovelAiDirectorRequestType,
  NovelAiEmotion,
} from "@/components/aiImage/types";

import {
  clampIntRange,
  sanitizeNovelAiTagInput,
} from "@/components/aiImage/helpers";
import { resolveBackendAugmentImageUrl } from "@/components/aiImage/api/backendUrls";
import { requestNovelAiBinaryViaProxy } from "@/components/aiImage/api/requestBinary";

export type NovelAiDirectorToolPayload = {
  req_type: NovelAiDirectorRequestType;
  use_new_shared_trial: true;
  image: string;
  width: number;
  height: number;
  prompt?: string;
  defry?: number;
  emotion?: NovelAiEmotion;
};

export function buildNovelAiDirectorToolPayload(args: {
  requestType: NovelAiDirectorRequestType;
  imageBase64: string;
  width: number;
  height: number;
  prompt?: string;
  defry?: number;
  emotion?: NovelAiEmotion;
}) {
  const payload: NovelAiDirectorToolPayload = {
    req_type: args.requestType,
    use_new_shared_trial: true,
    image: String(args.imageBase64 || "").trim(),
    width: Math.max(1, Math.floor(Number(args.width) || 0)),
    height: Math.max(1, Math.floor(Number(args.height) || 0)),
  };
  const prompt = sanitizeNovelAiTagInput(String(args.prompt || ""));
  if (prompt)
    payload.prompt = prompt;
  if (Number.isFinite(args.defry))
    payload.defry = clampIntRange(Number(args.defry), 0, 5, 0);
  if (args.emotion)
    payload.emotion = args.emotion;
  return payload;
}

export async function augmentNovelImageViaProxy(args: {
  requestType: NovelAiDirectorRequestType;
  imageBase64: string;
  width: number;
  height: number;
  prompt?: string;
  defry?: number;
  emotion?: NovelAiEmotion;
}) {
  const imageBase64 = String(args.imageBase64 || "").trim();
  if (!imageBase64)
    throw new Error("Director Tools 缺少源图。");

  const payload = buildNovelAiDirectorToolPayload({
    requestType: args.requestType,
    imageBase64,
    width: args.width,
    height: args.height,
    prompt: args.prompt,
    defry: args.defry,
    emotion: args.emotion,
  });

  const requestUrl = resolveBackendAugmentImageUrl();
  console.warn("[ai-image] request augment-image via backend", {
    requestUrl,
    reqType: payload.req_type,
  });
  const dataUrls = await requestNovelAiBinaryViaProxy(requestUrl, payload);
  return { dataUrls };
}
