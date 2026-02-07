export type AnnotationTone = "neutral" | "info" | "success" | "warning" | "accent" | "primary";

export type AnnotationDefinition = {
  id: string;
  label: string;
  category?: string;
  iconUrl?: string;
  tone?: AnnotationTone;
  source?: "builtin" | "custom";
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

  { id: "sys:cg", label: "CG", category: "图片", tone: "accent", source: "builtin" },
  { id: "sys:bg", label: "背景", category: "图片", tone: "primary", source: "builtin" },

  { id: "intro.hold", label: "黑屏保持", category: "文本", tone: "neutral", source: "builtin" },

  { id: "dialog.notend", label: "不暂停", category: "文本", tone: "neutral", source: "builtin" },
  { id: "dialog.concat", label: "续接", category: "文本", tone: "neutral", source: "builtin" },

  { id: "figure.pos.left", label: "立绘左", category: "动作", tone: "accent", source: "builtin" },
  { id: "figure.pos.center", label: "立绘中", category: "动作", tone: "accent", source: "builtin" },
  { id: "figure.pos.right", label: "立绘右", category: "动作", tone: "accent", source: "builtin" },
  { id: "figure.clear", label: "清除之前立绘", category: "动作", tone: "warning", source: "builtin" },
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
