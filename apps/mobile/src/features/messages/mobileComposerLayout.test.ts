import { describe, expect, it } from "vitest";

import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "../../lib/composer-layout-constants";
import { resolveComposerInputHeight } from "./mobileComposerLayout";

describe("resolveComposerInputHeight", () => {
  it("单行内容保持最小输入框高度", () => {
    expect(resolveComposerInputHeight(20)).toBe(COMPOSER_MIN_HEIGHT);
    expect(resolveComposerInputHeight(COMPOSER_MIN_HEIGHT)).toBe(COMPOSER_MIN_HEIGHT);
  });

  it("多行内容按 contentSize 高度增长但不超过最大高度", () => {
    expect(resolveComposerInputHeight(64.2)).toBe(65);
    expect(resolveComposerInputHeight(COMPOSER_MAX_HEIGHT + 40)).toBe(COMPOSER_MAX_HEIGHT);
  });

  it("异常测量值回退到最小高度", () => {
    expect(resolveComposerInputHeight(Number.NaN)).toBe(COMPOSER_MIN_HEIGHT);
  });
});
