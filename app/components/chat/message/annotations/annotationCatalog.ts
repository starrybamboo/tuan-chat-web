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

export const ANNOTATION_TONE_CLASSES: Record<AnnotationTone, string> = {
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

  { id: "effect.1", label: "特效1", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171542.webp", hideLabel: true, effectFrames: 36 },
  { id: "effect.2", label: "特效2", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171543.webp", hideLabel: true, effectFrames: 22 },
  { id: "effect.3", label: "特效3", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171545.webp", hideLabel: true, effectFrames: 26 },
  { id: "effect.4", label: "特效4", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171546.webp", hideLabel: true, effectFrames: 42 },
  { id: "effect.5", label: "特效5", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171548.webp", hideLabel: true, effectFrames: 33 },
  { id: "effect.6", label: "特效6", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171549.webp", hideLabel: true, effectFrames: 54 },
  { id: "effect.7", label: "特效7", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171550.webp", hideLabel: true, effectFrames: 47 },
  { id: "effect.8", label: "特效8", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171552.webp", hideLabel: true, effectFrames: 33 },
  { id: "effect.9", label: "特效9", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171553.webp", hideLabel: true, effectFrames: 34 },
  { id: "effect.10", label: "特效10", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171555.webp", hideLabel: true, effectFrames: 38 },
  { id: "effect.11", label: "特效11", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171556.webp", hideLabel: true, effectFrames: 26 },
  { id: "effect.12", label: "特效12", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171557.webp", hideLabel: true, effectFrames: 35 },
  { id: "effect.13", label: "特效13", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171558.webp", hideLabel: true, effectFrames: 20 },
  { id: "effect.14", label: "特效14", category: "特效", tone: "accent", source: "builtin", iconUrl: "/annotations/effects/飞书20260208-171627.webp", hideLabel: true, effectFrames: 26 },

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

export const getBuiltinAnnotations = (): AnnotationDefinition[] => BUILTIN_ANNOTATIONS.slice();

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
