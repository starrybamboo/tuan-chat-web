import type { FigureAnimationSettings, FigurePosition } from "@/types/voiceRenderTypes";

type FigurePositionKey = Exclude<FigurePosition, undefined>;

export const ANNOTATION_IDS = {
  BGM: "sys:bgm",
  SE: "sys:se",
  BACKGROUND: "sys:bg",
  CG: "sys:cg",
  IMAGE_SHOW: "image.show",
  INTRO_HOLD: "intro.hold",
  DIALOG_NOTEND: "dialog.notend",
  DIALOG_CONCAT: "dialog.concat",
  DIALOG_NEXT: "dialog.next",
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
  [ANNOTATION_IDS.FIGURE_ANIM_ENTER]: { animation: "position/enter" },
  [ANNOTATION_IDS.FIGURE_ANIM_EXIT]: { animation: "position/exit" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_LEFT]: { animation: "position/ba-enter-from-left" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_ENTER_FROM_RIGHT]: { animation: "position/ba-enter-from-right" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_LEFT]: { animation: "position/ba-exit-to-left" },
  [ANNOTATION_IDS.FIGURE_ANIM_BA_EXIT_TO_RIGHT]: { animation: "position/ba-exit-to-right" },
};

const FIGURE_ANIMATION_ID_SET = new Set(Object.keys(FIGURE_ANIMATION_MAP));

export function normalizeAnnotations(annotations?: string[]) {
  if (!Array.isArray(annotations))
    return [];
  return annotations.filter((item): item is string => typeof item === "string" && item.length > 0);
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
  const list = normalizeAnnotations(annotations);
  if (list.length === 0)
    return true;
  return list.includes(ANNOTATION_IDS.IMAGE_SHOW);
}

export function setAnnotation(annotations: string[] | undefined, id: string, enabled: boolean) {
  const list = normalizeAnnotations(annotations);
  const exists = list.includes(id);
  if (enabled) {
    return exists ? list : [...list, id];
  }
  return exists ? list.filter(item => item !== id) : list;
}

export function toggleAnnotation(annotations: string[] | undefined, id: string) {
  const list = normalizeAnnotations(annotations);
  return list.includes(id) ? list.filter(item => item !== id) : [...list, id];
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
