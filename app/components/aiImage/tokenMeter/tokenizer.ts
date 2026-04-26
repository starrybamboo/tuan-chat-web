import { Tokenizer } from "@huggingface/tokenizers";

import { sanitizeNovelAiTagInput } from "@/components/aiImage/helpers";

export type TokenCountResult = {
  count: number;
  exact: boolean;
};

export type TokenCountsByText = Record<string, TokenCountResult>;

const TOKENIZER_MODEL_DIR = "novelai-tokenizers/google-t5-small";
const tokenCountCache = new Map<string, TokenCountResult>();
let tokenizerPromise: Promise<Tokenizer | null> | null = null;

export function trimText(value: string) {
  return sanitizeNovelAiTagInput(String(value || ""));
}

export function trimKey(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function resolveTokenizerAssetPath(fileName: string) {
  const baseUrl = typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${TOKENIZER_MODEL_DIR}/${fileName}`;
}

function setTokenCache(key: string, value: TokenCountResult) {
  if (tokenCountCache.has(key))
    tokenCountCache.delete(key);
  tokenCountCache.set(key, value);
  if (tokenCountCache.size <= 256)
    return;
  const oldestKey = tokenCountCache.keys().next().value;
  if (oldestKey)
    tokenCountCache.delete(oldestKey);
}

function approximateNovelAiV45TokenCount(text: string) {
  const normalized = trimText(text);
  if (!normalized)
    return 0;
  const units = normalized.match(/[A-Z]+|\d+\.\d+|\d+|\S/gi) ?? [];
  return units.length + 1;
}

async function loadNovelAiV45Tokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = (async () => {
      try {
        const [tokenizerJson, tokenizerConfig] = await Promise.all([
          fetch(resolveTokenizerAssetPath("tokenizer.json")).then(async (response) => {
            if (!response.ok)
              throw new Error(`tokenizer.json ${response.status}`);
            return await response.json();
          }),
          fetch(resolveTokenizerAssetPath("tokenizer_config.json")).then(async (response) => {
            if (!response.ok)
              throw new Error(`tokenizer_config.json ${response.status}`);
            return await response.json();
          }),
        ]);
        return new Tokenizer(tokenizerJson, tokenizerConfig);
      }
      catch (error) {
        console.warn("[ai-image] failed to load NovelAI V4.5 tokenizer", error);
        return null;
      }
    })();
  }
  return await tokenizerPromise;
}

export async function countNovelAiV45Tokens(text: string): Promise<TokenCountResult> {
  const normalized = trimKey(String(text || ""));
  if (!normalized)
    return { count: 0, exact: true };

  const cached = tokenCountCache.get(normalized);
  if (cached)
    return cached;

  const tokenizer = await loadNovelAiV45Tokenizer();
  const result = tokenizer
    ? { count: tokenizer.encode(normalized).ids.length, exact: true }
    : { count: approximateNovelAiV45TokenCount(normalized), exact: false };

  setTokenCache(normalized, result);
  return result;
}
