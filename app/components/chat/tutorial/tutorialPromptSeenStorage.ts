export const TUTORIAL_PROMPT_SEEN_STORAGE_KEY = "tc:tutorial:onboarding:seen";

export type TutorialPromptType = "missing" | "update";

type TutorialPromptSeenMap = Record<string, true>;

type TutorialPromptVersion = {
  tutorialRepositoryId?: number | null;
  latestCommitId?: number | null;
};

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage ?? null;
  }
  catch {
    return null;
  }
}

export function readTutorialPromptSeenMap(): TutorialPromptSeenMap {
  const storage = getLocalStorage();
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(TUTORIAL_PROMPT_SEEN_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as TutorialPromptSeenMap;
  }
  catch {
    return {};
  }
}

export function hasSeenTutorialPrompt(seenKey: string | null) {
  if (!seenKey) {
    return false;
  }
  const seenMap = readTutorialPromptSeenMap();
  return seenMap[seenKey] === true;
}

export function markTutorialPromptSeen(seenKey: string | null) {
  const storage = getLocalStorage();
  if (!seenKey || !storage) {
    return;
  }
  const seenMap = readTutorialPromptSeenMap();
  seenMap[seenKey] = true;
  try {
    storage.setItem(TUTORIAL_PROMPT_SEEN_STORAGE_KEY, JSON.stringify(seenMap));
  }
  catch {
    // localStorage 可能被浏览器策略禁用，提示抑制失败不应影响主流程。
  }
}

export function buildTutorialPromptSeenKey(
  userId: number,
  promptType: TutorialPromptType,
  data: TutorialPromptVersion,
) {
  if (userId <= 0) {
    return null;
  }
  const tutorialRepositoryId = data.tutorialRepositoryId;
  if (typeof tutorialRepositoryId !== "number" || tutorialRepositoryId <= 0) {
    return null;
  }
  const latestCommitIdPart = data.latestCommitId ?? "none";
  return `u:${userId}:repo:${tutorialRepositoryId}:type:${promptType}:latest:${latestCommitIdPart}`;
}
