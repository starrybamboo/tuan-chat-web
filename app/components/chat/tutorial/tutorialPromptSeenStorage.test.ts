import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  TUTORIAL_PROMPT_SEEN_STORAGE_KEY,
  buildTutorialPromptSeenKey,
  hasSeenTutorialPrompt,
  markTutorialPromptSeen,
  readTutorialPromptSeenMap,
} from "./tutorialPromptSeenStorage";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("tutorial prompt seen storage", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("为同一用户、仓库、提示类型和提交生成稳定 key", () => {
    const seenKey = buildTutorialPromptSeenKey(7, "update", {
      tutorialRepositoryId: 116,
      latestCommitId: 3001,
    });

    expect(seenKey).toBe("u:7:repo:116:type:update:latest:3001");
  });

  it("缺少有效用户或教程仓库时不生成 key", () => {
    expect(buildTutorialPromptSeenKey(0, "missing", { tutorialRepositoryId: 116 })).toBeNull();
    expect(buildTutorialPromptSeenKey(7, "missing", { tutorialRepositoryId: 0 })).toBeNull();
    expect(buildTutorialPromptSeenKey(7, "missing", {})).toBeNull();
  });

  it("写入 seen key 后可以识别当前版本已忽略", () => {
    const seenKey = "u:7:repo:116:type:update:latest:3001";

    expect(hasSeenTutorialPrompt(seenKey)).toBe(false);
    markTutorialPromptSeen(seenKey);

    expect(hasSeenTutorialPrompt(seenKey)).toBe(true);
    expect(readTutorialPromptSeenMap()).toEqual({ [seenKey]: true });
  });

  it("localStorage 内容损坏时返回空记录并保持主流程可用", () => {
    storage.setItem(TUTORIAL_PROMPT_SEEN_STORAGE_KEY, "{broken");

    expect(readTutorialPromptSeenMap()).toEqual({});
    expect(hasSeenTutorialPrompt("anything")).toBe(false);
  });
});
