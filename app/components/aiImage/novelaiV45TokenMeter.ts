import { Tokenizer } from "@huggingface/tokenizers";
import { useEffect, useMemo, useState } from "react";

import type { V4CharEditorRow } from "@/components/aiImage/types";
import { sanitizeNovelAiTagInput } from "@/components/aiImage/helpers";

export const NOVELAI_V45_CONTEXT_LIMIT = 512;
export const NOVELAI_V45_CURATED_QUALITY_TAGS = "location, masterpiece, no text, -0.8::feet::, rating:general";

const NOVELAI_V45_UC_PRESET_TEXT: Record<number, string> = {
  0: "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page",
  1: "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page",
  2: "",
};

type TokenCountResult = {
  count: number;
  exact: boolean;
};

type TokenCountsByText = Record<string, TokenCountResult>;

type NovelAiV45ContextMeterStats = {
  localUsed: number;
  totalUsed: number;
  remaining: number;
  overflow: number;
  hiddenTokens: number;
};

export type NovelAiV45BaseMeterStats = NovelAiV45ContextMeterStats & {
  writtenTokens: number;
  characterTokens: number;
};

export type NovelAiV45CharacterMeterStats = NovelAiV45ContextMeterStats & {
  baseTokens: number;
  otherCharacterTokens: number;
};

export type NovelAiV45ChannelSnapshot = {
  base: NovelAiV45BaseMeterStats;
  characters: Record<string, NovelAiV45CharacterMeterStats>;
  hiddenLabel: string;
  hiddenText: string;
};

export type NovelAiV45TokenSnapshot = {
  status: "loading" | "ready" | "fallback";
  prompt: NovelAiV45ChannelSnapshot;
  negative: NovelAiV45ChannelSnapshot;
};

export type NovelAiV45TextRequests = {
  qualityTagsText: string;
  ucPresetText: string;
  basePromptText: string;
  basePromptCombinedText: string;
  baseNegativeText: string;
  baseNegativeCombinedText: string;
  characters: Array<{
    id: string;
    promptText: string;
    negativeText: string;
  }>;
  allTexts: string[];
};

const TOKENIZER_MODEL_DIR = "novelai-tokenizers/google-t5-small";
const tokenCountCache = new Map<string, TokenCountResult>();
let tokenizerPromise: Promise<Tokenizer | null> | null = null;

function trimText(value: string) {
  return sanitizeNovelAiTagInput(String(value || ""));
}

function trimKey(value: string) {
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
  const units = normalized.match(/[A-Za-z]+|\d+\.\d+|\d+|[^\s]/g) ?? [];
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

async function countNovelAiV45Tokens(text: string): Promise<TokenCountResult> {
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

function clampRemaining(totalUsed: number) {
  return Math.max(0, NOVELAI_V45_CONTEXT_LIMIT - totalUsed);
}

function clampOverflow(totalUsed: number) {
  return Math.max(0, totalUsed - NOVELAI_V45_CONTEXT_LIMIT);
}

function readTokenCount(text: string, countsByText: TokenCountsByText) {
  return countsByText[trimKey(text)]?.count ?? 0;
}

function joinTagParts(parts: string[]) {
  return parts
    .map(trimText)
    .filter(Boolean)
    .join(", ");
}

export function getNovelAiV45UcPresetText(ucPreset: number) {
  return NOVELAI_V45_UC_PRESET_TEXT[ucPreset] ?? "";
}

export function buildNovelAiV45TextRequests(args: {
  prompt: string;
  negativePrompt: string;
  v4Chars: V4CharEditorRow[];
  qualityToggle: boolean;
  ucPreset: number;
}): NovelAiV45TextRequests {
  const qualityTagsText = args.qualityToggle ? NOVELAI_V45_CURATED_QUALITY_TAGS : "";
  const ucPresetText = getNovelAiV45UcPresetText(args.ucPreset);
  const basePromptText = trimText(args.prompt);
  const baseNegativeText = trimText(args.negativePrompt);
  const basePromptCombinedText = joinTagParts([qualityTagsText, basePromptText]);
  const baseNegativeCombinedText = joinTagParts([ucPresetText, baseNegativeText]);
  const characters = args.v4Chars.map(row => ({
    id: row.id,
    promptText: trimText(row.prompt),
    negativeText: trimText(row.negativePrompt),
  }));

  const allTexts = Array.from(new Set([
    qualityTagsText,
    ucPresetText,
    basePromptText,
    basePromptCombinedText,
    baseNegativeText,
    baseNegativeCombinedText,
    ...characters.flatMap(row => [row.promptText, row.negativeText]),
  ].map(trimKey).filter(Boolean)));

  return {
    qualityTagsText,
    ucPresetText,
    basePromptText,
    basePromptCombinedText,
    baseNegativeText,
    baseNegativeCombinedText,
    characters,
    allTexts,
  };
}

export function buildNovelAiV45TokenSnapshot(
  requests: NovelAiV45TextRequests,
  countsByText: TokenCountsByText,
  status: "loading" | "ready" | "fallback",
): NovelAiV45TokenSnapshot {
  const promptBaseTokens = readTokenCount(requests.basePromptCombinedText, countsByText);
  const promptWrittenTokens = readTokenCount(requests.basePromptText, countsByText);
  const qualityTagTokens = readTokenCount(requests.qualityTagsText, countsByText);
  const promptCharacterEntries = requests.characters.map((row) => {
    return [row.id, readTokenCount(row.promptText, countsByText)] as const;
  });
  const promptCharacterTokens = Object.fromEntries(promptCharacterEntries);
  const promptCharacterTotal = promptCharacterEntries.reduce((sum, [, count]) => sum + count, 0);
  const promptTotal = promptBaseTokens + promptCharacterTotal;

  const negativeBaseTokens = readTokenCount(requests.baseNegativeCombinedText, countsByText);
  const negativeWrittenTokens = readTokenCount(requests.baseNegativeText, countsByText);
  const ucPresetTokens = readTokenCount(requests.ucPresetText, countsByText);
  const negativeCharacterEntries = requests.characters.map((row) => {
    return [row.id, readTokenCount(row.negativeText, countsByText)] as const;
  });
  const negativeCharacterTokens = Object.fromEntries(negativeCharacterEntries);
  const negativeCharacterTotal = negativeCharacterEntries.reduce((sum, [, count]) => sum + count, 0);
  const negativeTotal = negativeBaseTokens + negativeCharacterTotal;

  return {
    status,
    prompt: {
      base: {
        localUsed: promptBaseTokens,
        totalUsed: promptTotal,
        remaining: clampRemaining(promptTotal),
        overflow: clampOverflow(promptTotal),
        writtenTokens: promptWrittenTokens,
        hiddenTokens: qualityTagTokens,
        characterTokens: promptCharacterTotal,
      },
      characters: Object.fromEntries(requests.characters.map((row) => {
        const localUsed = promptCharacterTokens[row.id] ?? 0;
        return [row.id, {
          localUsed,
          totalUsed: promptTotal,
          remaining: clampRemaining(promptTotal),
          overflow: clampOverflow(promptTotal),
          baseTokens: promptBaseTokens,
          hiddenTokens: qualityTagTokens,
          otherCharacterTokens: Math.max(0, promptCharacterTotal - localUsed),
        }];
      })),
      hiddenLabel: "Quality Tags",
      hiddenText: requests.qualityTagsText,
    },
    negative: {
      base: {
        localUsed: negativeBaseTokens,
        totalUsed: negativeTotal,
        remaining: clampRemaining(negativeTotal),
        overflow: clampOverflow(negativeTotal),
        writtenTokens: negativeWrittenTokens,
        hiddenTokens: ucPresetTokens,
        characterTokens: negativeCharacterTotal,
      },
      characters: Object.fromEntries(requests.characters.map((row) => {
        const localUsed = negativeCharacterTokens[row.id] ?? 0;
        return [row.id, {
          localUsed,
          totalUsed: negativeTotal,
          remaining: clampRemaining(negativeTotal),
          overflow: clampOverflow(negativeTotal),
          baseTokens: negativeBaseTokens,
          hiddenTokens: ucPresetTokens,
          otherCharacterTokens: Math.max(0, negativeCharacterTotal - localUsed),
        }];
      })),
      hiddenLabel: "UC Preset",
      hiddenText: requests.ucPresetText,
    },
  };
}

export function useNovelAiV45TokenSnapshot(args: {
  prompt: string;
  negativePrompt: string;
  v4Chars: V4CharEditorRow[];
  qualityToggle: boolean;
  ucPreset: number;
}) {
  const serializedChars = useMemo(() => {
    return args.v4Chars
      .map(row => `${row.id}\u0000${row.prompt}\u0000${row.negativePrompt}`)
      .join("\u0001");
  }, [args.v4Chars]);

  const requests = useMemo(() => {
    return buildNovelAiV45TextRequests({
      prompt: args.prompt,
      negativePrompt: args.negativePrompt,
      v4Chars: args.v4Chars,
      qualityToggle: args.qualityToggle,
      ucPreset: args.ucPreset,
    });
  }, [args.negativePrompt, args.prompt, args.qualityToggle, args.ucPreset, serializedChars, args.v4Chars]);

  const [tokenState, setTokenState] = useState<{
    status: "loading" | "ready" | "fallback";
    countsByText: TokenCountsByText;
  }>({
    status: "loading",
    countsByText: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!requests.allTexts.length) {
        setTokenState((prev) => {
          if (prev.status === "ready" && Object.keys(prev.countsByText).length === 0)
            return prev;
          return {
            status: "ready",
            countsByText: {},
          };
        });
        return;
      }

      const entries = await Promise.all(requests.allTexts.map(async (text) => {
        return [text, await countNovelAiV45Tokens(text)] as const;
      }));

      if (cancelled)
        return;

      const nextCountsByText = Object.fromEntries(entries);
      const nextStatus = entries.every(([, value]) => value.exact) ? "ready" : "fallback";

      setTokenState((prev) => {
        const prevKeys = Object.keys(prev.countsByText);
        const nextKeys = Object.keys(nextCountsByText);
        const sameKeys = prevKeys.length === nextKeys.length && prevKeys.every(key => nextCountsByText[key] != null);
        const sameValues = sameKeys && prevKeys.every((key) => {
          const prevValue = prev.countsByText[key];
          const nextValue = nextCountsByText[key];
          return prevValue?.count === nextValue?.count && prevValue?.exact === nextValue?.exact;
        });
        if (prev.status === nextStatus && sameValues)
          return prev;
        return {
          status: nextStatus,
          countsByText: nextCountsByText,
        };
      });
    }

    setTokenState((prev) => {
      if (prev.status === "loading")
        return prev;
      return {
        status: "loading",
        countsByText: prev.countsByText,
      };
    });
    void run();

    return () => {
      cancelled = true;
    };
  }, [requests]);

  return useMemo(() => {
    return buildNovelAiV45TokenSnapshot(requests, tokenState.countsByText, tokenState.status);
  }, [requests, tokenState.countsByText, tokenState.status]);
}
