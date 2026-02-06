import type { FigurePosition } from "@/types/voiceRenderTypes";

type FigurePositionKey = Exclude<FigurePosition, undefined>;

export const ANNOTATION_IDS = {
  BGM: "sys:bgm",
  SE: "sys:se",
  BACKGROUND: "sys:bg",
  CG: "sys:cg",
  INTRO_HOLD: "intro.hold",
  DIALOG_NOTEND: "dialog.notend",
  DIALOG_CONCAT: "dialog.concat",
  FIGURE_POS_LEFT: "figure.pos.left",
  FIGURE_POS_CENTER: "figure.pos.center",
  FIGURE_POS_RIGHT: "figure.pos.right",
} as const;

const FIGURE_POSITION_IDS: Record<FigurePositionKey, string> = {
  left: ANNOTATION_IDS.FIGURE_POS_LEFT,
  center: ANNOTATION_IDS.FIGURE_POS_CENTER,
  right: ANNOTATION_IDS.FIGURE_POS_RIGHT,
};

const FIGURE_POSITION_BY_ID: Record<string, FigurePositionKey> = {
  [ANNOTATION_IDS.FIGURE_POS_LEFT]: "left",
  [ANNOTATION_IDS.FIGURE_POS_CENTER]: "center",
  [ANNOTATION_IDS.FIGURE_POS_RIGHT]: "right",
};

const FIGURE_POSITION_ID_SET = new Set(Object.values(FIGURE_POSITION_IDS));

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
  const list = normalizeAnnotations(annotations).filter(item => !FIGURE_POSITION_ID_SET.has(item));
  if (!position)
    return list;
  const id = FIGURE_POSITION_IDS[position];
  return id ? [...list, id] : list;
}

export const isFigurePositionAnnotationId = (id: string) => FIGURE_POSITION_ID_SET.has(id);

export const getFigurePositionFromAnnotationId = (id: string) => FIGURE_POSITION_BY_ID[id];

export function getFigurePositionFromAnnotations(annotations: string[] | undefined) {
  const list = normalizeAnnotations(annotations);
  const found = list.find(item => FIGURE_POSITION_BY_ID[item]);
  return found ? FIGURE_POSITION_BY_ID[found] : undefined;
}
