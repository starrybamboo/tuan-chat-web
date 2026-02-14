import type { ComponentType, SVGProps } from "react";

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

export type AnnotationTone = "neutral" | "info" | "success" | "warning" | "accent" | "primary";

export type AnnotationIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type AnnotationDefinition = {
  id: string;
  label: string;
  category?: string;
  iconUrl?: string;
  tone?: AnnotationTone;
  source?: "builtin" | "custom";
  icon?: AnnotationIcon;
  hideLabel?: boolean;
  effectFrames?: number;
};

const ANNOTATION_TONE_CLASSES: Record<AnnotationTone, string> = {
  neutral: "border-base-300 bg-base-200/70 text-base-content/80 hover:bg-base-300",
  info: "border-info/30 bg-info/15 text-info hover:bg-info/20",
  success: "border-success/30 bg-success/15 text-success hover:bg-success/20",
  warning: "border-warning/30 bg-warning/15 text-warning hover:bg-warning/20",
  accent: "border-accent/30 bg-accent/15 text-accent hover:bg-accent/20",
  primary: "border-primary/30 bg-primary/15 text-primary hover:bg-primary/20",
};

export function getAnnotationToneClass(tone: AnnotationTone = "neutral", active = false) {
  const base = ANNOTATION_TONE_CLASSES[tone] ?? ANNOTATION_TONE_CLASSES.neutral;
  if (!active) {
    return base;
  }
  return `${base} ring-2 ring-primary/30 shadow-sm`;
}

const BUILTIN_ANNOTATIONS: AnnotationDefinition[] = [
  { id: "sys:bgm", label: "BGM", category: "音频", tone: "info", source: "builtin" },
  { id: "sys:se", label: "音效", category: "音频", tone: "info", source: "builtin" },

  { id: "sys:cg", label: "CG", category: "图片", tone: "primary", source: "builtin" },
  { id: "sys:bg", label: "背景", category: "图片", tone: "primary", source: "builtin" },
  { id: "image.show", label: "展示", category: "图片", tone: "primary", source: "builtin" },

  { id: "effect.en_hmm.webp", label: "en_hmm", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_hmm.webp", hideLabel: true, effectFrames: 36 },
  { id: "effect.en_doubt.webp", label: "en_doubt", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_doubt.webp", hideLabel: true, effectFrames: 22 },
  { id: "effect.en_answer.webp", label: "en_answer", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_answer.webp", hideLabel: true, effectFrames: 26 },
  { id: "effect.en_sad.webp", label: "en_sad", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_sad.webp", hideLabel: true, effectFrames: 42 },
  { id: "effect.en_sweat.webp", label: "en_sweat", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_sweat.webp", hideLabel: true, effectFrames: 33 },
  { id: "effect.en_shiny.webp", label: "en_shiny", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_shiny.webp", hideLabel: true, effectFrames: 54 },
  { id: "effect.en_upset.webp", label: "en_upset", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_upset.webp", hideLabel: true, effectFrames: 47 },
  { id: "effect.en_shy.webp", label: "en_shy", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_shy.webp", hideLabel: true, effectFrames: 33 },
  { id: "effect.en_suki.webp", label: "en_suki", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_suki.webp", hideLabel: true, effectFrames: 34 },
  { id: "effect.en_warning.webp", label: "en_warning", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_warning.webp", hideLabel: true, effectFrames: 38 },
  { id: "effect.en_omit.webp", label: "en_omit", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_omit.webp", hideLabel: true, effectFrames: 26 },
  { id: "effect.en_chat.webp", label: "en_chat", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_chat.webp", hideLabel: true, effectFrames: 35 },
  { id: "effect.en_getit.webp", label: "en_getit", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_getit.webp", hideLabel: true, effectFrames: 20 },
  { id: "effect.en_angry.webp", label: "en_angry", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/en_angry.webp", hideLabel: true, effectFrames: 26 },

  { id: "figure.anim.ba-exit-to-left", label: "从左退场", category: "立绘", tone: "accent", source: "builtin", icon: ExitToLeftIcon, hideLabel: true },
  { id: "figure.anim.ba-enter-from-left", label: "从左入场", category: "立绘", tone: "accent", source: "builtin", icon: EnterFromLeftIcon, hideLabel: true },
  { id: "figure.anim.enter", label: "淡入", category: "立绘", tone: "accent", source: "builtin", icon: FadeInIcon, hideLabel: true },
  { id: "figure.anim.ba-down", label: "下落", category: "动作", tone: "accent", source: "builtin", icon: ActionDownIcon, hideLabel: true },
  { id: "figure.anim.ba-left-falldown", label: "左倒", category: "动作", tone: "accent", source: "builtin", icon: ActionFallLeftIcon, hideLabel: true },
  { id: "figure.anim.ba-right-falldown", label: "右倒", category: "动作", tone: "accent", source: "builtin", icon: ActionFallRightIcon, hideLabel: true },
  { id: "figure.anim.ba-jump-twice", label: "二连跳", category: "动作", tone: "accent", source: "builtin", icon: ActionJumpTwiceIcon, hideLabel: true },
  { id: "figure.anim.ba-jump", label: "跳跃", category: "动作", tone: "accent", source: "builtin", icon: ActionJumpIcon, hideLabel: true },
  { id: "figure.anim.ba-shake", label: "摇晃", category: "动作", tone: "accent", source: "builtin", icon: ActionShakeIcon, hideLabel: true },
  { id: "figure.anim.ba-bigshake", label: "大摇晃", category: "动作", tone: "accent", source: "builtin", icon: ActionBigShakeIcon, hideLabel: true },
  { id: "figure.pos.left", label: "左", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.left-center", label: "左中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.center", label: "中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.right-center", label: "右中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.right", label: "右", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.anim.exit", label: "淡出", category: "立绘", tone: "accent", source: "builtin", icon: FadeOutIcon, hideLabel: true },
  { id: "figure.anim.ba-enter-from-right", label: "从右入场", category: "立绘", tone: "accent", source: "builtin", icon: EnterFromRightIcon, hideLabel: true },
  { id: "figure.anim.ba-exit-to-right", label: "从右退场", category: "立绘", tone: "accent", source: "builtin", icon: ExitToRightIcon, hideLabel: true },
  { id: "dialog.notend", label: "不暂停", category: "控制", tone: "neutral", source: "builtin" },
  { id: "dialog.concat", label: "续接", category: "控制", tone: "neutral", source: "builtin" },
  { id: "dialog.next", label: "立即下一句", category: "控制", tone: "neutral", source: "builtin" },
  { id: "background.clear", label: "清除背景", category: "控制", tone: "warning", source: "builtin" },
  { id: "figure.clear", label: "清除立绘", category: "控制", tone: "warning", source: "builtin" },
];

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

function isValidAnnotation(value: any): value is AnnotationDefinition {
  return value && typeof value.id === "string" && typeof value.label === "string";
}

export function loadCustomAnnotations(): AnnotationDefinition[] {
  if (!isBrowser())
    return [];
  const raw = safeParseJson<any[]>(window.localStorage.getItem(CUSTOM_STORAGE_KEY), []);
  return Array.isArray(raw) ? raw.filter(isValidAnnotation).map(item => ({ ...item, source: "custom" })) : [];
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
  }));
  window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(payload));
}

export function mergeAnnotationCatalog(customItems?: AnnotationDefinition[]) {
  const seen = new Set<string>();
  const merged: AnnotationDefinition[] = [];
  const push = (item: AnnotationDefinition) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
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

export function getFrequentAnnotations(catalog: AnnotationDefinition[], usage: Record<string, number>, limit = 8) {
  const sorted = catalog
    .map(item => ({ item, count: usage[item.id] ?? 0 }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  return sorted.slice(0, limit).map(entry => entry.item);
}

export function buildCustomAnnotationId(label: string, existingIds: Set<string>) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const fallback = `anno-${Date.now().toString(36)}`;
  const slug = base || fallback;
  let candidate = `cust:${slug}`;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `cust:${slug}-${index}`;
    index += 1;
  }
  return candidate;
}
