import type { FigureAnimationSettings, FigurePosition } from "@/types/voiceRenderTypes";

type FigurePositionKey = Exclude<FigurePosition, undefined>;

const EFFECT_ANNOTATION_PREFIX = "effect.";
const EFFECT_FRAME_DURATION_MS = 50;
const EFFECT_DURATION_MS_BY_ID: Record<string, number> = {
  "effect.1": 1968,
  "effect.2": 2448,
  "effect.3": 1872,
  "effect.4": 2448,
  "effect.5": 1968,
  "effect.6": 2928,
  "effect.7": 2448,
  "effect.8": 1920,
  "effect.9": 1920,
  "effect.10": 1968,
  "effect.11": 2448,
  "effect.12": 1968,
  "effect.13": 3408,
  "effect.14": 1248,
};
const EFFECT_ANNOTATION_FRAMES: Record<string, number> = {
  "effect.1": 36,
  "effect.2": 22,
  "effect.3": 26,
  "effect.4": 42,
  "effect.5": 33,
  "effect.6": 54,
  "effect.7": 47,
  "effect.8": 33,
  "effect.9": 34,
  "effect.10": 38,
  "effect.11": 26,
  "effect.12": 35,
  "effect.13": 20,
  "effect.14": 26,
};
const EFFECT_TEXTURE_FILE_BY_ID: Record<string, string> = {
  "effect.1": "en_hmm.webp",
  "effect.2": "en_doubt.webp",
  "effect.3": "en_answer.webp",
  "effect.4": "en_sad.webp",
  "effect.5": "en_sweat.webp",
  "effect.6": "en_shiny.webp",
  "effect.7": "en_upset.webp",
  "effect.8": "en_shy.webp",
  "effect.9": "en_suki.webp",
  "effect.10": "en_warning.webp",
  "effect.11": "en_omit.webp",
  "effect.12": "en_chat.webp",
  "effect.13": "en_getit.webp",
  "effect.14": "en_angry.webp",
};
const EFFECT_ID_BY_TEXTURE_FILE = (() => {
  const map: Record<string, string> = {};
  for (const [effectId, fileName] of Object.entries(EFFECT_TEXTURE_FILE_BY_ID)) {
    map[fileName] = effectId;
  }
  return map;
})();

function toEffectTextureFile(effectIdOrName: string | undefined) {
  if (!effectIdOrName)
    return undefined;
  const raw = effectIdOrName.trim();
  if (!raw)
    return undefined;

  const directById = EFFECT_TEXTURE_FILE_BY_ID[raw];
  if (directById)
    return directById;

  if (raw.startsWith(EFFECT_ANNOTATION_PREFIX)) {
    const suffix = raw.slice(EFFECT_ANNOTATION_PREFIX.length).trim();
    if (!suffix)
      return undefined;
    const byNumeric = EFFECT_TEXTURE_FILE_BY_ID[`${EFFECT_ANNOTATION_PREFIX}${suffix}`];
    if (byNumeric)
      return byNumeric;
    const withExt = suffix.endsWith(".webp") ? suffix : `${suffix}.webp`;
    if (EFFECT_ID_BY_TEXTURE_FILE[withExt])
      return withExt;
    // 兼容 effect.<文件名> / effect.<文件名>.webp 形式的自定义特效
    return withExt;
  }

  const withExt = raw.endsWith(".webp") ? raw : `${raw}.webp`;
  if (EFFECT_ID_BY_TEXTURE_FILE[withExt])
    return withExt;
  return undefined;
}

function toEffectId(effectIdOrName: string | undefined) {
  const fileName = toEffectTextureFile(effectIdOrName);
  return fileName ? EFFECT_ID_BY_TEXTURE_FILE[fileName] : undefined;
}

export function normalizeEffectAnnotationId(id: string) {
  const fileName = toEffectTextureFile(id);
  if (!fileName)
    return undefined;
  return `${EFFECT_ANNOTATION_PREFIX}${fileName}`;
}

export const ANNOTATION_IDS = {
  BGM: "sys:bgm",
  BGM_CLEAR: "bgm.clear",
  SE: "sys:se",
  BACKGROUND: "sys:bg",
  BACKGROUND_CLEAR: "background.clear",
  CG: "sys:cg",
  IMAGE_SHOW: "image.show",
  IMAGE_CLEAR: "image.clear",
  INTRO_HOLD: "intro.hold",
  DIALOG_NOTEND: "dialog.notend",
  DIALOG_CONCAT: "dialog.concat",
  DIALOG_NEXT: "dialog.next",
  VIDEO_SKIP_OFF: "video.skipoff",
  FIGURE_POS_LEFT: "figure.pos.left",
  FIGURE_POS_LEFT_CENTER: "figure.pos.left-center",
  FIGURE_POS_CENTER: "figure.pos.center",
  FIGURE_POS_RIGHT_CENTER: "figure.pos.right-center",
  FIGURE_POS_RIGHT: "figure.pos.right",
  FIGURE_CLEAR: "figure.clear",
  FIGURE_ANIM_ENTER: "figure.anim.enter",
  FIGURE_ANIM_EXIT: "figure.anim.exit",
  FIGURE_ANIM_BA_ENTER_FROM_LEFT: "figure.anim.ba-enter-from-left",
  FIGURE_ANIM_BA_ENTER_FROM_RIGHT: "figure.anim.ba-enter-from-right",
  FIGURE_ANIM_BA_EXIT_TO_LEFT: "figure.anim.ba-exit-to-left",
  FIGURE_ANIM_BA_EXIT_TO_RIGHT: "figure.anim.ba-exit-to-right",
  FIGURE_ANIM_BA_DOWN: "figure.anim.ba-down",
  FIGURE_ANIM_BA_LEFT_FALLDOWN: "figure.anim.ba-left-falldown",
  FIGURE_ANIM_BA_RIGHT_FALLDOWN: "figure.anim.ba-right-falldown",
  FIGURE_ANIM_BA_JUMP_TWICE: "figure.anim.ba-jump-twice",
  FIGURE_ANIM_BA_JUMP: "figure.anim.ba-jump",
  FIGURE_ANIM_BA_SHAKE: "figure.anim.ba-shake",
  FIGURE_ANIM_BA_BIGSHAKE: "figure.anim.ba-bigshake",
} as const;

const FIGURE_POSITION_IDS: Record<FigurePositionKey, string> = {
  "left": ANNOTATION_IDS.FIGURE_POS_LEFT,
  "left-center": ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER,
  "center": ANNOTATION_IDS.FIGURE_POS_CENTER,
  "right-center": ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER,
  "right": ANNOTATION_IDS.FIGURE_POS_RIGHT,
};

const FIGURE_POSITION_BY_ID: Record<string, FigurePositionKey> = {
  [ANNOTATION_IDS.FIGURE_POS_LEFT]: "left",
  [ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER]: "left-center",
  [ANNOTATION_IDS.FIGURE_POS_CENTER]: "center",
  [ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER]: "right-center",
  [ANNOTATION_IDS.FIGURE_POS_RIGHT]: "right",
};

const FIGURE_POSITION_ID_SET = new Set(Object.values(FIGURE_POSITION_IDS));

const FIGURE_ANIMATION_MAP: Record<string, FigureAnimationSettings> = {
  [ANNOTATION_IDS.FIGURE_ANIM_ENTER]: { enterAnimation: "position/enter" },
  [ANNOTATION_IDS.FIGURE_ANIM_EXIT]: { exitAnimation: "position/exit" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_LEFT]: { enterAnimation: "position/ba-enter-from-left" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_RIGHT]: { enterAnimation: "position/ba-enter-from-right" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_LEFT]: { exitAnimation: "position/ba-exit-to-left" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT]: { exitAnimation: "position/ba-exit-to-right" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_DOWN]: { animation: "action/BA-down" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_LEFT_FALLDOWN]: { animation: "action/BA-left-falldown" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_RIGHT_FALLDOWN]: { animation: "action/BA-right-falldown" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP_TWICE]: { animation: "action/BA-jump-twice" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP]: { animation: "action/BA-jump" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_SHAKE]: { animation: "action/BA-shake" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_BIGSHAKE]: { animation: "action/BA-bigshake" },
};

const FIGURE_ANIMATION_ID_SET = new Set(Object.keys(FIGURE_ANIMATION_MAP));

export function normalizeAnnotations(annotations?: string[]) {
  if (!Array.isArray(annotations))
    return [];
  return annotations
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .map(item => normalizeEffectAnnotationId(item) ?? item);
}

export function normalizeAnnotationSet(annotations?: string[]) {
  const list = normalizeAnnotations(annotations);
  const unique = Array.from(new Set(list));
  unique.sort();
  return unique;
}

export function areAnnotationsEqual(a?: string[], b?: string[]) {
  const left = normalizeAnnotationSet(a);
  const right = normalizeAnnotationSet(b);
  if (left.length !== right.length)
    return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i])
      return false;
  }
  return true;
}

export function hasAnnotation(annotations: string[] | undefined, id: string) {
  return normalizeAnnotations(annotations).includes(id);
}

export function isImageMessageBackground(
  annotations: string[] | undefined,
  imageMessage?: { background?: boolean } | null,
) {
  return Boolean(imageMessage?.background) || hasAnnotation(annotations, ANNOTATION_IDS.BACKGROUND);
}

export function isImageMessageShown(annotations: string[] | undefined) {
  return normalizeAnnotations(annotations).includes(ANNOTATION_IDS.IMAGE_SHOW);
}

export function hasClearImageAnnotation(annotations: string[] | undefined) {
  return normalizeAnnotations(annotations).includes(ANNOTATION_IDS.IMAGE_CLEAR);
}

export function setAnnotation(annotations: string[] | undefined, id: string, enabled: boolean) {
  const list = normalizeAnnotations(annotations);
  const normalizedId = normalizeEffectAnnotationId(id) ?? id;
  const exists = list.includes(normalizedId);
  if (enabled) {
    return exists ? list : [...list, normalizedId];
  }
  return exists ? list.filter(item => item !== normalizedId) : list;
}

export function toggleAnnotation(annotations: string[] | undefined, id: string) {
  const list = normalizeAnnotations(annotations);
  const normalizedId = normalizeEffectAnnotationId(id) ?? id;
  return list.includes(normalizedId) ? list.filter(item => item !== normalizedId) : [...list, normalizedId];
}

export function setFigurePositionAnnotation(annotations: string[] | undefined, position?: FigurePosition) {
  const list = normalizeAnnotations(annotations)
    .filter(item => !FIGURE_POSITION_ID_SET.has(item));
  if (!position)
    return list;
  const cleaned = list.filter(item => item !== ANNOTATION_IDS.FIGURE_CLEAR);
  const id = FIGURE_POSITION_IDS[position];
  if (!id || cleaned.includes(id)) {
    return cleaned;
  }
  return [...cleaned, id];
}

export const isFigurePositionAnnotationId = (id: string) => FIGURE_POSITION_ID_SET.has(id);

export const getFigurePositionFromAnnotationId = (id: string) => FIGURE_POSITION_BY_ID[id];

export function hasClearFigureAnnotation(annotations: string[] | undefined) {
  return normalizeAnnotations(annotations).includes(ANNOTATION_IDS.FIGURE_CLEAR);
}

export function hasClearBackgroundAnnotation(annotations: string[] | undefined) {
  return normalizeAnnotations(annotations).includes(ANNOTATION_IDS.BACKGROUND_CLEAR);
}

export function hasClearBgmAnnotation(annotations: string[] | undefined) {
  return normalizeAnnotations(annotations).includes(ANNOTATION_IDS.BGM_CLEAR);
}

export function getFigurePositionFromAnnotations(annotations: string[] | undefined) {
  const list = normalizeAnnotations(annotations);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const id = list[i];
    if (FIGURE_POSITION_BY_ID[id]) {
      return FIGURE_POSITION_BY_ID[id];
    }
  }
  return undefined;
}

export function getEffectFromAnnotations(annotations: string[] | undefined) {
  const list = normalizeAnnotations(annotations);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const id = list[i];
    const effectId = toEffectId(id);
    if (effectId) {
      return effectId;
    }
    if (id.startsWith(EFFECT_ANNOTATION_PREFIX)) {
      return id; // 兼容未来自定义 effect.* 标注
    }
  }
  return undefined;
}

export function getEffectFrameCount(effectId: string | undefined) {
  const normalizedEffectId = toEffectId(effectId) ?? effectId;
  if (!normalizedEffectId)
    return undefined;
  return EFFECT_ANNOTATION_FRAMES[normalizedEffectId];
}

export function getEffectDurationMs(effectId: string | undefined) {
  const normalizedEffectId = toEffectId(effectId) ?? effectId;
  if (!normalizedEffectId)
    return undefined;
  const fixedDuration = EFFECT_DURATION_MS_BY_ID[normalizedEffectId];
  if (typeof fixedDuration === "number")
    return fixedDuration;
  const frames = getEffectFrameCount(normalizedEffectId);
  if (!frames)
    return undefined;
  return Math.max(1, frames) * EFFECT_FRAME_DURATION_MS;
}

export { EFFECT_FRAME_DURATION_MS };

export function getEffectSoundFileCandidates(effectId: string | undefined) {
  const textureFile = toEffectTextureFile(effectId);
  if (!textureFile)
    return undefined;
  const baseName = textureFile.replace(/\.webp$/i, "");
  const candidates = Array.from(new Set([
    `${baseName}.mp3`,
    `${baseName}.webm`,
  ]));
  return candidates.length > 0 ? candidates : undefined;
}

export function getEffectSoundFileName(effectId: string | undefined) {
  return getEffectSoundFileCandidates(effectId)?.[0];
}

export function getFigureAnimationFromAnnotations(annotations: string[] | undefined): FigureAnimationSettings | undefined {
  const list = normalizeAnnotations(annotations);
  if (list.length === 0)
    return undefined;
  let enterAnimation: string | undefined;
  let exitAnimation: string | undefined;
  let animation: string | undefined;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const id = list[i];
    if (!FIGURE_ANIMATION_ID_SET.has(id))
      continue;
    const mapping = FIGURE_ANIMATION_MAP[id];
    if (!mapping)
      continue;
    if (!enterAnimation && mapping.enterAnimation) {
      enterAnimation = mapping.enterAnimation;
    }
    if (!exitAnimation && mapping.exitAnimation) {
      exitAnimation = mapping.exitAnimation;
    }
    if (!animation && mapping.animation) {
      animation = mapping.animation;
    }
    if (enterAnimation && exitAnimation && animation) {
      break;
    }
  }
  if (!enterAnimation && !exitAnimation && !animation)
    return undefined;
  return {
    ...(enterAnimation ? { enterAnimation } : {}),
    ...(exitAnimation ? { exitAnimation } : {}),
    ...(animation ? { animation } : {}),
  };
}
