import { describe, expect, it } from "vitest";

import {
  NOVELAI_V45_CURATED_QUALITY_TAGS,
  buildNovelAiV45TextRequests,
  buildNovelAiV45TokenSnapshot,
  getNovelAiV45UcPresetText,
} from "@/components/aiImage/novelaiV45TokenMeter";

describe("novelai V4.5 token meter helpers", () => {
  it("builds merged base prompt text with hidden quality tags", () => {
    const requests = buildNovelAiV45TextRequests({
      prompt: "1girl, city lights",
      negativePrompt: "",
      qualityToggle: true,
      ucPreset: 2,
      v4Chars: [],
    });

    expect(requests.qualityTagsText).toBe(NOVELAI_V45_CURATED_QUALITY_TAGS);
    expect(requests.basePromptCombinedText).toBe(`${NOVELAI_V45_CURATED_QUALITY_TAGS}, 1girl, city lights`);
  });

  it("builds merged negative prompt text with the selected UC preset", () => {
    const requests = buildNovelAiV45TextRequests({
      prompt: "",
      negativePrompt: "bad hands",
      qualityToggle: false,
      ucPreset: 1,
      v4Chars: [],
    });

    expect(requests.ucPresetText).toBe(getNovelAiV45UcPresetText(1));
    expect(requests.baseNegativeCombinedText).toBe(`${getNovelAiV45UcPresetText(1)}, bad hands`);
  });

  it("creates base and character snapshots from pre-counted tokens", () => {
    const requests = buildNovelAiV45TextRequests({
      prompt: "1girl",
      negativePrompt: "bad hands",
      qualityToggle: true,
      ucPreset: 1,
      v4Chars: [
        { id: "a", prompt: "blue hair", negativePrompt: "extra fingers", centerX: 0.5, centerY: 0.5 },
        { id: "b", prompt: "school uniform", negativePrompt: "", centerX: 0.5, centerY: 0.5 },
      ],
    });

    const counts = {
      [requests.basePromptText]: { count: 2, exact: true },
      [requests.qualityTagsText]: { count: 7, exact: true },
      [requests.basePromptCombinedText]: { count: 10, exact: true },
      [requests.baseNegativeText]: { count: 3, exact: true },
      [requests.ucPresetText]: { count: 9, exact: true },
      [requests.baseNegativeCombinedText]: { count: 11, exact: true },
      [requests.characters[0].promptText]: { count: 3, exact: true },
      [requests.characters[0].negativeText]: { count: 4, exact: true },
      [requests.characters[1].promptText]: { count: 5, exact: true },
    };

    const snapshot = buildNovelAiV45TokenSnapshot(requests, counts, "ready");

    expect(snapshot.prompt.base.localUsed).toBe(10);
    expect(snapshot.prompt.base.writtenTokens).toBe(2);
    expect(snapshot.prompt.base.hiddenTokens).toBe(7);
    expect(snapshot.prompt.base.characterTokens).toBe(8);
    expect(snapshot.prompt.base.totalUsed).toBe(18);

    expect(snapshot.prompt.characters.a.localUsed).toBe(3);
    expect(snapshot.prompt.characters.a.baseTokens).toBe(10);
    expect(snapshot.prompt.characters.a.hiddenTokens).toBe(7);
    expect(snapshot.prompt.characters.a.otherCharacterTokens).toBe(5);
    expect(snapshot.prompt.characters.a.totalUsed).toBe(18);

    expect(snapshot.negative.base.localUsed).toBe(11);
    expect(snapshot.negative.base.writtenTokens).toBe(3);
    expect(snapshot.negative.base.hiddenTokens).toBe(9);
    expect(snapshot.negative.base.characterTokens).toBe(4);
    expect(snapshot.negative.characters.a.otherCharacterTokens).toBe(0);
  });
});
