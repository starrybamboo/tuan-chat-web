export type WebgalChooseOptionDraft = {
  id: string;
  text: string;
  code: string;
};

function createWebgalChooseOptionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  return `webgal-option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWebgalChooseOptionDraft(overrides: Partial<WebgalChooseOptionDraft> = {}): WebgalChooseOptionDraft {
  return {
    id: createWebgalChooseOptionId(),
    text: "",
    code: "",
    ...overrides,
  };
}
