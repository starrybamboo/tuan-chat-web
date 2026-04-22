import type { V4CharEditorRow } from "@/components/aiImage/types";

import type { TokenCountsByText } from "@/components/aiImage/tokenMeter/tokenizer";
import {
  trimKey,
  trimText,
} from "@/components/aiImage/tokenMeter/tokenizer";

export const NOVELAI_V45_CONTEXT_LIMIT = 512;
export const NOVELAI_V45_CURATED_QUALITY_TAGS = "location, masterpiece, no text, -0.8::feet::, rating:general";

const NOVELAI_V45_UC_PRESET_TEXT: Record<number, string> = {
  0: "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page",
  1: "blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page",
  2: "",
};

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
