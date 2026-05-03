import type { InferRequest } from "@/tts/engines/index/apiClient";

import { createTTSApi, ttsApi } from "@/tts/engines/index/apiClient";
import { mediaFileUrl } from "@/utils/mediaUrl";

import type { RealtimeTTSConfig } from "./realtimeRendererConfig";

import { checkFileExist, uploadFile } from "./fileOperator";

type RoleWithVoiceUrl = {
  voiceUrl?: string | null;
  voiceFileId?: number | null;
};

type GenerateAndUploadVocalOptions = {
  text: string;
  roleId: number;
  avatarTitle?: Record<string, string>;
  customEmotionVector?: number[];
  getTtsConfig: () => RealtimeTTSConfig;
  voiceFileMap: ReadonlyMap<number, File>;
  uploadedVocalsMap: Map<string, string>;
  ttsGeneratingMap: Map<string, Promise<string | null>>;
  gameName: string;
};

const REALTIME_TTS_EMOTION_ORDER = ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"];
const REALTIME_TTS_MAX_EMOTION_SUM = 0.5;

/**
 * 简单的字符串哈希函数（用于 TTS 缓存）。
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = (hash * 33) ^ char;
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
    + ((hash * 0x811C9DC5) >>> 0).toString(16).padStart(8, "0");
}

export function convertAvatarTitleToEmotionVector(avatarTitle: Record<string, string>): number[] {
  let emotionVector = REALTIME_TTS_EMOTION_ORDER.map((emotion) => {
    const value = avatarTitle[emotion];
    const numValue = value ? Number.parseFloat(value) * 0.5 : 0.0;
    return Math.max(0.0, Math.min(1.4, numValue));
  });

  const currentSum = emotionVector.reduce((sum, val) => sum + val, 0);
  if (currentSum > REALTIME_TTS_MAX_EMOTION_SUM) {
    const scaleFactor = REALTIME_TTS_MAX_EMOTION_SUM / currentSum;
    emotionVector = emotionVector.map(val => val * scaleFactor);
  }

  return emotionVector.map(val => Math.round(val * 10000) / 10000);
}

export function resolveRealtimeTtsEmotionVector(
  avatarTitle?: Record<string, string>,
  customEmotionVector?: number[],
): number[] {
  return customEmotionVector && customEmotionVector.length > 0
    ? customEmotionVector
    : (avatarTitle ? convertAvatarTitleToEmotionVector(avatarTitle) : []);
}

export function buildRealtimeTtsCacheKey(
  text: string,
  refVocalName: string,
  emotionVector: number[],
): string {
  return simpleHash(`tts_${text}_${refVocalName}_${JSON.stringify(emotionVector)}`);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function fetchVoiceFilesFromRoleMap(
  roleMap: ReadonlyMap<number, RoleWithVoiceUrl>,
  voiceFileMap: Map<number, File>,
): Promise<void> {
  for (const [roleId, role] of roleMap) {
    const voiceUrl = mediaFileUrl(role.voiceFileId, "audio", "original") || role.voiceUrl;
    if (voiceUrl && !voiceFileMap.has(roleId)) {
      try {
        const response = await fetch(voiceUrl);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File(
            [blob],
            voiceUrl.split("/").pop() ?? `${roleId}_ref_vocal.wav`,
            { type: blob.type || "audio/wav" },
          );
          voiceFileMap.set(roleId, file);
          console.warn(`[RealtimeRenderer] 获取角色 ${roleId} 的参考音频成功`);
        }
      }
      catch (error) {
        console.warn(`[RealtimeRenderer] 获取角色 ${roleId} 的参考音频失败:`, error);
      }
    }
  }
}

/**
 * 生成语音并上传到 WebGAL，使用缓存和生成中 Promise 避免重复请求。
 */
export async function generateAndUploadVocal({
  text,
  roleId,
  avatarTitle,
  customEmotionVector,
  getTtsConfig,
  voiceFileMap,
  uploadedVocalsMap,
  ttsGeneratingMap,
  gameName,
}: GenerateAndUploadVocalOptions): Promise<string | null> {
  if (!getTtsConfig().enabled) {
    return null;
  }

  const refVocal = voiceFileMap.get(roleId);
  if (!refVocal) {
    console.warn(`[RealtimeRenderer] 角色 ${roleId} 没有参考音频，跳过 TTS`);
    return null;
  }

  const emotionVector = resolveRealtimeTtsEmotionVector(avatarTitle, customEmotionVector);
  const cacheKey = buildRealtimeTtsCacheKey(text, refVocal.name, emotionVector);
  const fileName = `${cacheKey}.webm`;

  if (uploadedVocalsMap.has(cacheKey)) {
    return uploadedVocalsMap.get(cacheKey) || null;
  }

  if (ttsGeneratingMap.has(cacheKey)) {
    return ttsGeneratingMap.get(cacheKey) || null;
  }

  try {
    const exists = await checkFileExist(`games/${gameName}/game/vocal/`, fileName);
    if (exists) {
      uploadedVocalsMap.set(cacheKey, fileName);
      return fileName;
    }
  }
  catch {
    // 忽略检查错误，继续生成。
  }

  const generatePromise = (async (): Promise<string | null> => {
    try {
      const refAudioBase64 = await fileToBase64(refVocal);
      const ttsConfig = getTtsConfig();
      const ttsRequest: InferRequest = {
        text,
        prompt_audio_base64: refAudioBase64,
        emo_mode: ttsConfig.emotionMode ?? 2,
        emo_weight: ttsConfig.emotionWeight ?? 0.8,
        emo_vector: emotionVector.length > 0 ? emotionVector : undefined,
        emo_random: false,
        temperature: ttsConfig.temperature ?? 0.8,
        top_p: ttsConfig.topP ?? 0.8,
        max_text_tokens_per_segment: ttsConfig.maxTokensPerSegment ?? 120,
        return_audio_base64: true,
      };

      console.warn(`[RealtimeRenderer] 正在生成语音: "${text.substring(0, 20)}..."`);
      const api = ttsConfig.apiUrl ? createTTSApi(ttsConfig.apiUrl) : ttsApi;
      const response = await api.infer(ttsRequest);

      if (response.code !== 0 || !response.data?.audio_base64) {
        console.error("[RealtimeRenderer] TTS 生成失败:", response.msg);
        return null;
      }

      const byteCharacters = atob(response.data.audio_base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const audioBlob = new Blob([byteArray], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);
      try {
        const uploadedFileName = await uploadFile(
          audioUrl,
          `games/${gameName}/game/vocal/`,
          fileName,
        );
        uploadedVocalsMap.set(cacheKey, uploadedFileName);
        console.warn(`[RealtimeRenderer] 语音生成并上传成功: ${uploadedFileName}`);
        return uploadedFileName;
      }
      catch (uploadError) {
        console.error("[RealtimeRenderer] 语音上传失败:", uploadError);
        return null;
      }
      finally {
        URL.revokeObjectURL(audioUrl);
      }
    }
    catch (error) {
      console.error("[RealtimeRenderer] TTS 生成过程中发生错误:", error);
      return null;
    }
    finally {
      ttsGeneratingMap.delete(cacheKey);
    }
  })();

  ttsGeneratingMap.set(cacheKey, generatePromise);
  return generatePromise;
}
