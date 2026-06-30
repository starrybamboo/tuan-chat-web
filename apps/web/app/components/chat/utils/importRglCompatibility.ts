import type { StateEventVarOpKind } from "@/types/stateEvent";

import { ANNOTATION_IDS } from "@/types/messageAnnotations";
import { STATE_EVENT_VAR_OP } from "@/types/stateEvent";

export type RglRoleRef = {
  roleName: string;
  avatarName: string;
  speakerName?: string;
  opacity?: number;
};

export const FIGURE_POSITION_ANNOTATION_IDS = new Set<string>([
  ANNOTATION_IDS.FIGURE_POS_LEFT,
  ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER,
  ANNOTATION_IDS.FIGURE_POS_CENTER,
  ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER,
  ANNOTATION_IDS.FIGURE_POS_RIGHT,
]);

export const DEFAULT_MULTI_DIALOG_POSITIONS = [
  ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER,
  ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER,
  ANNOTATION_IDS.FIGURE_POS_CENTER,
  ANNOTATION_IDS.FIGURE_POS_LEFT,
  ANNOTATION_IDS.FIGURE_POS_RIGHT,
];

const KNOWN_ANNOTATION_IDS = new Set<string>(Object.values(ANNOTATION_IDS));

const RGL_ANNOTATION_ALIASES = new Map<string, string>([
  ["background", ANNOTATION_IDS.BACKGROUND],
  ["bg", ANNOTATION_IDS.BACKGROUND],
  ["bgm", ANNOTATION_IDS.BGM],
  ["music", ANNOTATION_IDS.BGM],
  ["se", ANNOTATION_IDS.SE],
  ["sound", ANNOTATION_IDS.SE],
  ["cg", ANNOTATION_IDS.CG],
  ["image", ANNOTATION_IDS.IMAGE_SHOW],
  ["image.show", ANNOTATION_IDS.IMAGE_SHOW],
  ["enter", ANNOTATION_IDS.FIGURE_ANIM_ENTER],
  ["exit", ANNOTATION_IDS.FIGURE_ANIM_EXIT],
  ["shake", ANNOTATION_IDS.FIGURE_ANIM_BA_SHAKE],
  ["bigshake", ANNOTATION_IDS.FIGURE_ANIM_BA_BIGSHAKE],
  ["jump", ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP],
  ["jump2", ANNOTATION_IDS.FIGURE_ANIM_BA_JUMP_TWICE],
  ["down", ANNOTATION_IDS.FIGURE_ANIM_BA_DOWN],
  ["left-falldown", ANNOTATION_IDS.FIGURE_ANIM_BA_LEFT_FALLDOWN],
  ["right-falldown", ANNOTATION_IDS.FIGURE_ANIM_BA_RIGHT_FALLDOWN],
  ["left", ANNOTATION_IDS.FIGURE_POS_LEFT],
  ["left-center", ANNOTATION_IDS.FIGURE_POS_LEFT_CENTER],
  ["center", ANNOTATION_IDS.FIGURE_POS_CENTER],
  ["right-center", ANNOTATION_IDS.FIGURE_POS_RIGHT_CENTER],
  ["right", ANNOTATION_IDS.FIGURE_POS_RIGHT],
  ["clear", ANNOTATION_IDS.FIGURE_CLEAR],
  ["clearfigure", ANNOTATION_IDS.FIGURE_CLEAR],
  ["clearbg", ANNOTATION_IDS.BACKGROUND_CLEAR],
  ["clearbackground", ANNOTATION_IDS.BACKGROUND_CLEAR],
  ["clearbgm", ANNOTATION_IDS.BGM_CLEAR],
  ["clearimage", ANNOTATION_IDS.IMAGE_CLEAR],
  ["rain", ANNOTATION_IDS.SCENE_EFFECT_RAIN],
  ["snow", ANNOTATION_IDS.SCENE_EFFECT_SNOW],
  ["sakura", ANNOTATION_IDS.SCENE_EFFECT_SAKURA],
  ["stop", ANNOTATION_IDS.SCENE_EFFECT_STOP],
]);

const RGL_CLEAR_TARGET_ALIASES = new Map<string, string[]>([
  ["figure", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["figures", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["character", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["characters", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["立绘", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["角色", [ANNOTATION_IDS.FIGURE_CLEAR]],
  ["bg", [ANNOTATION_IDS.BACKGROUND_CLEAR]],
  ["background", [ANNOTATION_IDS.BACKGROUND_CLEAR]],
  ["背景", [ANNOTATION_IDS.BACKGROUND_CLEAR]],
  ["bgm", [ANNOTATION_IDS.BGM_CLEAR]],
  ["music", [ANNOTATION_IDS.BGM_CLEAR]],
  ["音乐", [ANNOTATION_IDS.BGM_CLEAR]],
  ["image", [ANNOTATION_IDS.IMAGE_CLEAR]],
  ["images", [ANNOTATION_IDS.IMAGE_CLEAR]],
  ["cg", [ANNOTATION_IDS.IMAGE_CLEAR]],
  ["图片", [ANNOTATION_IDS.IMAGE_CLEAR]],
  ["图像", [ANNOTATION_IDS.IMAGE_CLEAR]],
  ["all", [
    ANNOTATION_IDS.FIGURE_CLEAR,
    ANNOTATION_IDS.BACKGROUND_CLEAR,
    ANNOTATION_IDS.BGM_CLEAR,
    ANNOTATION_IDS.IMAGE_CLEAR,
  ]],
  ["全部", [
    ANNOTATION_IDS.FIGURE_CLEAR,
    ANNOTATION_IDS.BACKGROUND_CLEAR,
    ANNOTATION_IDS.BGM_CLEAR,
    ANNOTATION_IDS.IMAGE_CLEAR,
  ]],
]);

export function splitRoleRef(value: string): RglRoleRef | null {
  const normalized = value.trim();
  const aliasSeparatorIndex = normalized.indexOf("=");
  if (aliasSeparatorIndex === 0) {
    return null;
  }
  const speakerName = aliasSeparatorIndex > 0
    ? normalized.slice(0, aliasSeparatorIndex).trim()
    : undefined;
  const roleRefText = aliasSeparatorIndex > 0
    ? normalized.slice(aliasSeparatorIndex + 1).trim()
    : normalized;
  if (aliasSeparatorIndex > 0 && !speakerName) {
    return null;
  }

  const roleRef = splitBoundRoleRef(roleRefText);
  return roleRef ? { ...roleRef, ...(speakerName ? { speakerName } : {}) } : null;
}

export function splitRoleRefs(value: string): RglRoleRef[] | null {
  const normalized = value.trim();
  if (!normalized.includes(",")) {
    const role = splitRoleRef(normalized);
    return role ? [role] : null;
  }
  if (normalized.includes("=")) {
    return null;
  }

  const tokens = normalized
    .split(",")
    .map(token => token.trim())
    .filter(Boolean);
  if (tokens.length <= 1) {
    return null;
  }

  const explicitAvatarName = [...tokens]
    .reverse()
    .map(token => splitBoundRoleRef(token)?.avatarName)
    .find(Boolean);

  const roles = tokens.map((token) => {
    const explicit = splitBoundRoleRef(token);
    if (explicit) {
      return explicit;
    }
    if (!explicitAvatarName) {
      return null;
    }
    return splitBoundRoleRef(`${token}.${explicitAvatarName}`);
  });

  if (roles.some(role => !role)) {
    return null;
  }
  return roles as RglRoleRef[];
}

function parseRoleOpacity(value: string): { roleName: string; opacity?: number } {
  const matched = value.match(/^(.*)\((\d+(?:\.\d+)?%?)\)$/);
  if (!matched) {
    return { roleName: value.trim() };
  }
  const roleName = (matched[1] ?? "").trim();
  const rawOpacity = (matched[2] ?? "").trim();
  const numeric = Number.parseFloat(rawOpacity.replace(/%$/, ""));
  if (!roleName || !Number.isFinite(numeric)) {
    return { roleName: value.trim() };
  }
  const opacity = rawOpacity.endsWith("%") || numeric > 1
    ? Math.max(0, Math.min(1, numeric / 100))
    : Math.max(0, Math.min(1, numeric));
  return { roleName, opacity };
}

function splitBoundRoleRef(value: string): Pick<RglRoleRef, "roleName" | "avatarName" | "opacity"> | null {
  const normalized = value.trim();
  const separatorIndex = normalized.lastIndexOf(".");
  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null;
  }
  const parsedRole = parseRoleOpacity(normalized.slice(0, separatorIndex).trim());
  const roleName = parsedRole.roleName;
  const avatarName = normalized.slice(separatorIndex + 1).trim();
  return roleName && avatarName
    ? { roleName, avatarName, ...(parsedRole.opacity != null ? { opacity: parsedRole.opacity } : {}) }
    : null;
}

function getBackgroundTransitionSpeedAnnotation(value: string) {
  const numeric = Number.parseFloat(value.trim());
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  if (numeric <= 15) {
    return ANNOTATION_IDS.BACKGROUND_SPEED_FAST;
  }
  if (numeric <= 45) {
    return ANNOTATION_IDS.BACKGROUND_SPEED_NORMAL;
  }
  return ANNOTATION_IDS.BACKGROUND_SPEED_SLOW;
}

function normalizeRglParameterToken(token: string): string[] | null {
  const normalized = token.trim();
  const transitionMatched = normalized.match(/^(replace|black|white)\s*=\s*(\d+(?:\.\d+)?)$/i);
  if (transitionMatched) {
    const speed = getBackgroundTransitionSpeedAnnotation(transitionMatched[2] ?? "");
    return [
      ANNOTATION_IDS.BACKGROUND_ANIM_ENTER,
      ...(speed ? [speed] : []),
    ];
  }
  return null;
}

export function normalizeRglAnnotationToken(annotationId: string): string[] {
  const normalized = annotationId.trim();
  const setMatched = normalized.match(/^set\s*:\s*(.+)$/i);
  if (setMatched) {
    return normalizeRglAnnotationToken(setMatched[1] ?? "");
  }

  const parameterAnnotations = normalizeRglParameterToken(normalized);
  if (parameterAnnotations) {
    return parameterAnnotations;
  }

  const alias = RGL_ANNOTATION_ALIASES.get(normalized.toLowerCase());
  return [alias ?? normalized];
}

export function readAnnotationPrefix(text: string): { annotations: string[]; rest: string } | null {
  let rest = text.trimStart();
  const annotations: string[] = [];
  while (rest.startsWith("<")) {
    const closeIndex = rest.indexOf(">");
    if (closeIndex <= 1) {
      return null;
    }
    const annotationId = rest.slice(1, closeIndex).trim();
    if (!annotationId) {
      return null;
    }
    annotations.push(...normalizeRglAnnotationToken(annotationId));
    rest = rest.slice(closeIndex + 1).trimStart();
  }
  return { annotations, rest };
}

export function validateAnnotations(annotations: string[]) {
  return annotations.find(annotationId => !KNOWN_ANNOTATION_IDS.has(annotationId)) ?? null;
}

export function splitRglTuplePayload(payload: string) {
  const trimmed = payload.trim();
  const body = trimmed.startsWith("(") && trimmed.endsWith(")")
    ? trimmed.slice(1, -1)
    : trimmed;
  return body
    .split(/[，,]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function formatRglNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.?0+$/, "");
}

export function parseFiniteNumberText(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parsePositiveIntegerText(value: string) {
  const numeric = parseFiniteNumberText(value);
  return numeric != null && Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function isHpKey(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "hp"
    || normalized === "hitpoint"
    || normalized === "hitpoints"
    || normalized === "生命"
    || normalized === "生命值"
    || normalized === "体力"
    || normalized === "血量";
}

export function parseHitpointValue(value: string): { op: StateEventVarOpKind; value: number; maxValue?: number } | null {
  const normalized = value.trim();
  const slashMatched = normalized.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (slashMatched) {
    const hp = parseFiniteNumberText(slashMatched[1] ?? "");
    const maxValue = parseFiniteNumberText(slashMatched[2] ?? "");
    return hp != null && maxValue != null
      ? { op: STATE_EVENT_VAR_OP.SET, value: hp, maxValue }
      : null;
  }

  const deltaMatched = normalized.match(/^([+-])\s*(\d+(?:\.\d+)?)$/);
  if (deltaMatched) {
    const numeric = parseFiniteNumberText(deltaMatched[2] ?? "");
    if (numeric == null) {
      return null;
    }
    return {
      op: deltaMatched[1] === "-" ? STATE_EVENT_VAR_OP.SUB : STATE_EVENT_VAR_OP.ADD,
      value: Math.abs(numeric),
    };
  }

  const numeric = parseFiniteNumberText(normalized);
  return numeric == null ? null : { op: STATE_EVENT_VAR_OP.SET, value: numeric };
}

export function buildHitpointContent(roleName: string, value: { op: StateEventVarOpKind; value: number; maxValue?: number }) {
  const valueText = formatRglNumber(value.value);
  if (value.op === STATE_EVENT_VAR_OP.SET && value.maxValue != null) {
    return `状态更新：${roleName} HP = ${valueText}/${formatRglNumber(value.maxValue)}`;
  }
  const opText = value.op === STATE_EVENT_VAR_OP.SET
    ? "="
    : value.op === STATE_EVENT_VAR_OP.ADD ? "+" : "-";
  return `状态更新：${roleName} HP ${opText}${value.op === STATE_EVENT_VAR_OP.SET ? " " : ""}${valueText}`;
}

function parseRglAudioBoxToken(token: string): { materialName: string; timing?: string } | null {
  const [materialNamePart, ...optionParts] = token.split(";");
  const materialName = (materialNamePart ?? "").trim();
  if (!materialName || materialName === "*") {
    return null;
  }
  const timing = optionParts.join(";").trim();
  return {
    materialName,
    ...(timing ? { timing } : {}),
  };
}

export function extractTrailingAudioBoxes(content: string) {
  let rest = content.trimEnd();
  const audioRefs: Array<{ materialName: string; timing?: string }> = [];
  while (true) {
    const matched = rest.match(/\{([^{}\n]*)\}\s*$/);
    if (!matched) {
      break;
    }
    const parsed = parseRglAudioBoxToken(matched[1] ?? "");
    rest = rest.slice(0, matched.index).trimEnd();
    if (parsed) {
      audioRefs.unshift(parsed);
    }
  }
  return { content: rest, audioRefs };
}

export function resolveClearTargetAnnotations(payload: string) {
  const normalized = payload.trim().toLowerCase();
  return RGL_CLEAR_TARGET_ALIASES.get(normalized) ?? null;
}

export function resolveAnimationPayloadAnnotations(payload: string): { annotations: string[] } | { error: string } {
  const [animationToken = "", positionToken = ""] = splitRglTuplePayload(payload);
  const animationAnnotations = animationToken
    ? normalizeRglAnnotationToken(animationToken)
    : [];
  const positionAnnotations = positionToken
    ? normalizeRglAnnotationToken(positionToken)
    : [];
  const annotations = [...animationAnnotations, ...positionAnnotations];
  const unknownAnnotation = validateAnnotations(annotations);
  if (unknownAnnotation) {
    return { error: `未知 animation：${unknownAnnotation}` };
  }
  const unsupportedAnnotation = annotations.find(annotationId =>
    !FIGURE_POSITION_ANNOTATION_IDS.has(annotationId)
    && !annotationId.startsWith("figure.anim.")
    && !annotationId.startsWith("effect."),
  );
  if (unsupportedAnnotation) {
    return { error: `animation 不支持 annotation：${unsupportedAnnotation}` };
  }
  if (annotations.length === 0) {
    return { error: "<animation> 需要写动画名" };
  }
  return { annotations };
}
