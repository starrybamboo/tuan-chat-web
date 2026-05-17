export type AnnotationTone = "neutral" | "info" | "success" | "warning" | "accent" | "primary";

export type AnnotationDefinition = {
  id: string;
  label: string;
  category?: string;
  iconUrl?: string;
  tone?: AnnotationTone;
  showInNormalMode?: boolean;
  source?: "builtin" | "custom";
  hideLabel?: boolean;
  effectFrames?: number;
};

export const BUILTIN_ANNOTATIONS: AnnotationDefinition[] = [
  { id: "sys:bgm", label: "BGM", category: "音频", tone: "info", source: "builtin" },
  { id: "sys:se", label: "音效", category: "音频", tone: "info", source: "builtin" },

  { id: "sys:cg", label: "CG", category: "图片", tone: "primary", source: "builtin" },
  { id: "sys:bg", label: "背景", category: "图片", tone: "primary", source: "builtin" },
  { id: "image.show", label: "展示", category: "图片", tone: "primary", source: "builtin" },

  { id: "effect.en_hmm.webp", label: "en_hmm", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 36, showInNormalMode: true },
  { id: "effect.en_doubt.webp", label: "en_doubt", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 22, showInNormalMode: true },
  { id: "effect.en_answer.webp", label: "en_answer", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 26, showInNormalMode: true },
  { id: "effect.en_sad.webp", label: "en_sad", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 42, showInNormalMode: true },
  { id: "effect.en_sweat.webp", label: "en_sweat", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 33, showInNormalMode: true },
  { id: "effect.en_shiny.webp", label: "en_shiny", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 54, showInNormalMode: true },
  { id: "effect.en_upset.webp", label: "en_upset", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 47, showInNormalMode: true },
  { id: "effect.en_shy.webp", label: "en_shy", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 33, showInNormalMode: true },
  { id: "effect.en_suki.webp", label: "en_suki", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 34, showInNormalMode: true },
  { id: "effect.en_warning.webp", label: "en_warning", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 38, showInNormalMode: true },
  { id: "effect.en_omit.webp", label: "en_omit", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 26, showInNormalMode: true },
  { id: "effect.en_chat.webp", label: "en_chat", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 35, showInNormalMode: true },
  { id: "effect.en_getit.webp", label: "en_getit", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 20, showInNormalMode: true },
  { id: "effect.en_angry.webp", label: "en_angry", category: "特效", tone: "accent", source: "builtin", hideLabel: true, effectFrames: 26, showInNormalMode: true },

  { id: "figure.mini-avatar", label: "小头像", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-exit-to-left", label: "从左退场", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-enter-from-left", label: "从左入场", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.enter", label: "淡入", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-down", label: "下落", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-left-falldown", label: "左倒", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-right-falldown", label: "右倒", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-jump-twice", label: "二连跳", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-jump", label: "跳跃", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-shake", label: "摇晃", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-bigshake", label: "大摇晃", category: "动作", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.pos.left", label: "左", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.left-center", label: "左中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.center", label: "中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.right-center", label: "右中", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.pos.right", label: "右", category: "立绘", tone: "accent", source: "builtin" },
  { id: "figure.anim.exit", label: "淡出", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-enter-from-right", label: "从右入场", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },
  { id: "figure.anim.ba-exit-to-right", label: "从右退场", category: "立绘", tone: "accent", source: "builtin", showInNormalMode: true },

  { id: "dialog.notend", label: "不暂停", category: "控制", tone: "neutral", source: "builtin" },
  { id: "dialog.concat", label: "续接", category: "控制", tone: "neutral", source: "builtin" },
  { id: "dialog.next", label: "立即下一句", category: "控制", tone: "neutral", source: "builtin" },
  { id: "video.skipoff", label: "禁止跳过", category: "控制", tone: "warning", source: "builtin" },
  { id: "scene.effect.rain", label: "下雨", category: "控制", tone: "info", source: "builtin" },
  { id: "scene.effect.snow", label: "下雪", category: "控制", tone: "info", source: "builtin" },
  { id: "scene.effect.sakura", label: "樱花", category: "控制", tone: "info", source: "builtin" },
  { id: "scene.effect.stop", label: "停止特效", category: "控制", tone: "warning", source: "builtin" },
  { id: "image.clear", label: "清除展示图", category: "控制", tone: "warning", source: "builtin" },
  { id: "background.clear", label: "清除背景", category: "控制", tone: "warning", source: "builtin" },
  { id: "bgm.clear", label: "清除BGM", category: "控制", tone: "warning", source: "builtin" },
  { id: "figure.clear", label: "清除立绘", category: "控制", tone: "warning", source: "builtin" },
];

const NORMAL_MODE_HIDDEN_ANNOTATION_IDS = new Set([
  "figure.pos.left",
  "figure.pos.left-center",
  "figure.pos.center",
  "figure.pos.right-center",
  "figure.pos.right",
  "dialog.notend",
  "dialog.concat",
  "dialog.next",
  "video.skipoff",
  "figure.clear",
]);

export function getAnnotationCatalog(): AnnotationDefinition[] {
  return BUILTIN_ANNOTATIONS.map(item => ({
    ...item,
    showInNormalMode: item.showInNormalMode ?? !NORMAL_MODE_HIDDEN_ANNOTATION_IDS.has(item.id),
  }));
}

export function buildAnnotationMap(): Map<string, AnnotationDefinition> {
  return new Map(getAnnotationCatalog().map(item => [item.id, item]));
}

export function getAnnotationsByCategory(catalog: AnnotationDefinition[]): Map<string, AnnotationDefinition[]> {
  const map = new Map<string, AnnotationDefinition[]>();
  for (const item of catalog) {
    const cat = item.category ?? "其他";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return map;
}

export function normalizeAnnotations(annotations?: string[]): string[] {
  if (!Array.isArray(annotations)) return [];
  return annotations.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function toggleAnnotation(annotations: string[] | undefined, id: string): string[] {
  const list = normalizeAnnotations(annotations);
  return list.includes(id) ? list.filter(item => item !== id) : [...list, id];
}
