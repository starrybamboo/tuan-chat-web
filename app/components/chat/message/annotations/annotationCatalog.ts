import type { ComponentType, SVGProps } from "react";

import type { AnnotationDefinition as BaseAnnotationDefinition } from "@tuanchat/domain/annotation-catalog";

import {
  ActionBigShakeIcon,
  ActionDownIcon,
  ActionFallLeftIcon,
  ActionFallRightIcon,
  ActionJumpIcon,
  ActionJumpTwiceIcon,
  ActionShakeIcon,
  EnterFromLeftIcon,
  EnterFromRightIcon,
  ExitToLeftIcon,
  ExitToRightIcon,
  FadeInIcon,
  FadeOutIcon,
} from "@/components/chat/message/annotations/annotationIcons";

export type { AnnotationTone } from "@tuanchat/domain/annotation-catalog";

export {
  buildCustomAnnotationId,
  getAnnotationsByCategory,
  getFrequentAnnotations,
  normalizeAnnotations,
  NORMAL_MODE_HIDDEN_ANNOTATION_IDS,
  toggleAnnotation,
  withNormalModeVisibilityDefaults,
} from "@tuanchat/domain/annotation-catalog";

import {
  BUILTIN_ANNOTATIONS as BASE_BUILTIN_ANNOTATIONS,
  isValidAnnotation,
  NORMAL_MODE_HIDDEN_ANNOTATION_IDS,
  withNormalModeVisibilityDefaults,
} from "@tuanchat/domain/annotation-catalog";

export type AnnotationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type AnnotationDefinition = BaseAnnotationDefinition & {
  icon?: AnnotationIcon;
};

const ICON_MAP: Record<string, AnnotationIcon> = {
  "figure.anim.ba-exit-to-left": ExitToLeftIcon,
  "figure.anim.ba-enter-from-left": EnterFromLeftIcon,
  "figure.anim.enter": FadeInIcon,
  "figure.anim.ba-down": ActionDownIcon,
  "figure.anim.ba-left-falldown": ActionFallLeftIcon,
  "figure.anim.ba-right-falldown": ActionFallRightIcon,
  "figure.anim.ba-jump-twice": ActionJumpTwiceIcon,
  "figure.anim.ba-jump": ActionJumpIcon,
  "figure.anim.ba-shake": ActionShakeIcon,
  "figure.anim.ba-bigshake": ActionBigShakeIcon,
  "figure.anim.exit": FadeOutIcon,
  "figure.anim.ba-enter-from-right": EnterFromRightIcon,
  "figure.anim.ba-exit-to-right": ExitToRightIcon,
};

const BUILTIN_ANNOTATIONS: AnnotationDefinition[] = BASE_BUILTIN_ANNOTATIONS.map(item => ({
  ...item,
  ...(ICON_MAP[item.id] ? { icon: ICON_MAP[item.id] } : {}),
}));

const CUSTOM_STORAGE_KEY = "tc:message-annotations:custom";
const USAGE_STORAGE_KEY = "tc:message-annotations:usage";

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw)
    return fallback;
  try {
    return JSON.parse(raw) as T;
  }
  catch {
    return fallback;
  }
}

export function loadCustomAnnotations(): AnnotationDefinition[] {
  if (!isBrowser())
    return [];
  const raw = safeParseJson<any[]>(window.localStorage.getItem(CUSTOM_STORAGE_KEY), []);
  return Array.isArray(raw)
    ? raw
        .filter(isValidAnnotation)
        .map(item => withNormalModeVisibilityDefaults({ ...item, source: "custom" as const }))
    : [];
}

export function saveCustomAnnotations(items: AnnotationDefinition[]) {
  if (!isBrowser())
    return;
  const payload = items.map(item => ({
    id: item.id,
    label: item.label,
    category: item.category,
    iconUrl: item.iconUrl,
    tone: item.tone,
    showInNormalMode: item.showInNormalMode ?? !NORMAL_MODE_HIDDEN_ANNOTATION_IDS.has(item.id),
  }));
  window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(payload));
}

export function mergeAnnotationCatalog(customItems?: AnnotationDefinition[]) {
  const seen = new Set<string>();
  const merged: AnnotationDefinition[] = [];
  const push = (item: AnnotationDefinition) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(withNormalModeVisibilityDefaults(item));
    }
  };
  BUILTIN_ANNOTATIONS.forEach(push);
  (customItems ?? loadCustomAnnotations()).forEach(push);
  return merged;
}

export function buildAnnotationMap(customItems?: AnnotationDefinition[]) {
  const catalog = mergeAnnotationCatalog(customItems);
  return new Map(catalog.map(item => [item.id, item]));
}

export function loadAnnotationUsage(): Record<string, number> {
  if (!isBrowser())
    return {};
  const raw = safeParseJson<Record<string, number>>(window.localStorage.getItem(USAGE_STORAGE_KEY), {});
  return raw && typeof raw === "object" ? raw : {};
}

export function recordAnnotationUsage(id: string) {
  if (!isBrowser())
    return;
  const usage = loadAnnotationUsage();
  usage[id] = (usage[id] ?? 0) + 1;
  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
}
