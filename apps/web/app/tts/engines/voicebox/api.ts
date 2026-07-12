export const DEFAULT_VOICEBOX_API_URL = "http://127.0.0.1:17493";
export const DEFAULT_VOICEBOX_VOICE_ID = "Serena";
export const VOICEBOX_QWEN_CUSTOM_MODEL_NAME = "qwen-custom-voice-0.6B";

export const VOICEBOX_QWEN_CUSTOM_VOICES = [
  { id: "Vivian", label: "Vivian（明亮中文女声）", language: "zh" },
  { id: "Serena", label: "Serena（温柔中文女声）", language: "zh" },
  { id: "Uncle_Fu", label: "Uncle Fu（低沉中文男声）", language: "zh" },
  { id: "Dylan", label: "Dylan（北京青年男声）", language: "zh" },
  { id: "Eric", label: "Eric（成都青年男声）", language: "zh" },
  { id: "Ryan", label: "Ryan（英文男声）", language: "en" },
  { id: "Aiden", label: "Aiden（美式男声）", language: "en" },
  { id: "Ono_Anna", label: "Ono Anna（日文女声）", language: "ja" },
  { id: "Sohee", label: "Sohee（韩文女声）", language: "ko" },
] as const;

export type VoiceboxQwenCustomVoiceId = typeof VOICEBOX_QWEN_CUSTOM_VOICES[number]["id"];
export type VoiceboxLanguage = "zh" | "en" | "ja" | "ko" | "de" | "fr" | "ru" | "pt" | "es" | "it";

type VoiceboxProfile = {
  id: string;
  name: string;
  language: string;
  voice_type: string;
  preset_engine?: string | null;
  preset_voice_id?: string | null;
  default_engine?: string | null;
};

type VoiceboxGeneration = {
  id: string;
  status: string;
  error?: string | null;
};

class VoiceboxRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "VoiceboxRequestError";
  }
}

type GenerateVoiceboxCustomVoiceOptions = {
  baseUrl?: string;
  text: string;
  voiceId?: VoiceboxQwenCustomVoiceId;
  language?: VoiceboxLanguage;
  instruct?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

const profilePromiseCache = new Map<string, Promise<VoiceboxProfile>>();

export function normalizeVoiceboxBaseUrl(baseUrl?: string): string {
  const normalized = String(baseUrl ?? "").trim().replace(/\/+$/, "");
  return normalized || DEFAULT_VOICEBOX_API_URL;
}

function getProfileCacheKey(baseUrl: string, voiceId: VoiceboxQwenCustomVoiceId): string {
  return `${normalizeVoiceboxBaseUrl(baseUrl)}|${voiceId}`;
}

function invalidateVoiceboxProfileCache(
  baseUrl: string,
  voiceId: VoiceboxQwenCustomVoiceId,
): void {
  profilePromiseCache.delete(getProfileCacheKey(baseUrl, voiceId));
}

function getVoiceDefinition(voiceId: VoiceboxQwenCustomVoiceId) {
  return VOICEBOX_QWEN_CUSTOM_VOICES.find(voice => voice.id === voiceId)
    ?? VOICEBOX_QWEN_CUSTOM_VOICES.find(voice => voice.id === DEFAULT_VOICEBOX_VOICE_ID)!;
}

async function readVoiceboxError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (payload?.detail && typeof payload.detail === "object") {
      return JSON.stringify(payload.detail);
    }
  }
  return (await response.text().catch(() => "")).trim() || `HTTP ${response.status}`;
}

async function requestVoiceboxJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${normalizeVoiceboxBaseUrl(baseUrl)}${path}`, init);
  if (!response.ok) {
    throw new VoiceboxRequestError(
      response.status,
      `VoiceBox 请求失败：${await readVoiceboxError(response)}`,
    );
  }
  return response.json() as Promise<T>;
}

async function resolveQwenCustomVoiceProfile(
  baseUrl: string,
  voiceId: VoiceboxQwenCustomVoiceId,
): Promise<VoiceboxProfile> {
  const profiles = await requestVoiceboxJson<VoiceboxProfile[]>(baseUrl, "/profiles");
  const existing = profiles.find(profile =>
    profile.voice_type === "preset"
    && profile.preset_engine === "qwen_custom_voice"
    && profile.preset_voice_id === voiceId
  );
  if (existing) {
    return existing;
  }

  const voice = getVoiceDefinition(voiceId);
  return requestVoiceboxJson<VoiceboxProfile>(baseUrl, "/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `TuanChat CustomVoice ${voice.id}`,
      description: "团剧共创自动创建的 VoiceBox Qwen CustomVoice 预设音色。",
      language: voice.language,
      voice_type: "preset",
      preset_engine: "qwen_custom_voice",
      preset_voice_id: voice.id,
      default_engine: "qwen_custom_voice",
    }),
  });
}

export function ensureVoiceboxQwenCustomVoiceProfile(
  baseUrl: string,
  voiceId: VoiceboxQwenCustomVoiceId,
): Promise<VoiceboxProfile> {
  const normalizedBaseUrl = normalizeVoiceboxBaseUrl(baseUrl);
  const cacheKey = getProfileCacheKey(normalizedBaseUrl, voiceId);
  const existing = profilePromiseCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const pending = resolveQwenCustomVoiceProfile(normalizedBaseUrl, voiceId)
    .catch((error) => {
      profilePromiseCache.delete(cacheKey);
      throw error;
    });
  profilePromiseCache.set(cacheKey, pending);
  return pending;
}

export function clearVoiceboxProfileCache(): void {
  profilePromiseCache.clear();
}

function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function requestVoiceboxGeneration(
  baseUrl: string,
  profileId: string,
  text: string,
  options: GenerateVoiceboxCustomVoiceOptions,
): Promise<VoiceboxGeneration> {
  return requestVoiceboxJson<VoiceboxGeneration>(baseUrl, "/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: profileId,
      text,
      language: options.language ?? "zh",
      model_size: "0.6B",
      engine: "qwen_custom_voice",
      instruct: options.instruct?.trim() || undefined,
      normalize: true,
      max_chunk_chars: 800,
      crossfade_ms: 50,
    }),
  });
}

export async function generateVoiceboxCustomVoice(
  options: GenerateVoiceboxCustomVoiceOptions,
): Promise<Blob> {
  const text = options.text.trim();
  if (!text) {
    throw new Error("VoiceBox 生成文本不能为空");
  }

  const baseUrl = normalizeVoiceboxBaseUrl(options.baseUrl);
  const voiceId = options.voiceId ?? DEFAULT_VOICEBOX_VOICE_ID;
  let profile = await ensureVoiceboxQwenCustomVoiceProfile(baseUrl, voiceId);
  let generation: VoiceboxGeneration;

  try {
    generation = await requestVoiceboxGeneration(baseUrl, profile.id, text, options);
  }
  catch (error) {
    if (!(error instanceof VoiceboxRequestError) || error.status !== 404) {
      throw error;
    }

    // VoiceBox 中的 Profile 可能在前端缓存期间被删除，重建后重试一次。
    invalidateVoiceboxProfileCache(baseUrl, voiceId);
    profile = await ensureVoiceboxQwenCustomVoiceProfile(baseUrl, voiceId);
    generation = await requestVoiceboxGeneration(baseUrl, profile.id, text, options);
  }

  const pollIntervalMs = options.pollIntervalMs ?? 1000;
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;
  let current = generation;

  while (current.status !== "completed") {
    if (current.status === "failed") {
      throw new Error(`VoiceBox 生成失败：${current.error || "未知错误"}`);
    }
    if (Date.now() >= deadline) {
      throw new Error("VoiceBox 生成超时，请检查模型下载或推理状态");
    }
    await wait(pollIntervalMs);
    current = await requestVoiceboxJson<VoiceboxGeneration>(baseUrl, `/history/${generation.id}`);
  }

  const audioResponse = await fetch(`${baseUrl}/audio/${generation.id}`);
  if (!audioResponse.ok) {
    throw new Error(`VoiceBox 音频下载失败：${await readVoiceboxError(audioResponse)}`);
  }
  return audioResponse.blob();
}
