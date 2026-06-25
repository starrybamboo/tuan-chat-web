export const ANNOTATION_IDS = {
  BACKGROUND_CLEAR: "background.clear",
  BGM: "sys:bgm",
  FIGURE_CLEAR: "figure.clear",
  SCENE_EFFECT_RAIN: "scene.effect.rain",
  SCENE_EFFECT_SAKURA: "scene.effect.sakura",
  SCENE_EFFECT_SNOW: "scene.effect.snow",
  SCENE_EFFECT_STOP: "scene.effect.stop",
  SE: "sys:se",
} as const;

type SceneEffectName = "rain" | "snow" | "cherryBlossoms" | "none";

const SCENE_EFFECT_LABEL_MAP: Record<SceneEffectName, string> = {
  none: "停止特效",
  rain: "下雨",
  cherryBlossoms: "樱花",
  snow: "下雪",
};

const SCENE_EFFECT_NAME_BY_ANNOTATION: Record<string, SceneEffectName> = {
  [ANNOTATION_IDS.SCENE_EFFECT_RAIN]: "rain",
  [ANNOTATION_IDS.SCENE_EFFECT_SAKURA]: "cherryBlossoms",
  [ANNOTATION_IDS.SCENE_EFFECT_SNOW]: "snow",
  [ANNOTATION_IDS.SCENE_EFFECT_STOP]: "none",
};

const SCENE_EFFECT_ALIAS_MAP: Record<string, SceneEffectName> = {
  cherryblossoms: "cherryBlossoms",
  none: "none",
  rain: "rain",
  sakura: "cherryBlossoms",
  snow: "snow",
  stop: "none",
};

export function normalizeAnnotations(annotations?: readonly string[] | null): string[] {
  if (!Array.isArray(annotations)) {
    return [];
  }
  return annotations.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function hasAnnotation(annotations: readonly string[] | undefined | null, id: string): boolean {
  return normalizeAnnotations(annotations).includes(id);
}

export function resolveSoundPurposeFromAnnotations(
  annotations: readonly string[] | undefined | null,
  payloadPurpose?: unknown,
): "bgm" | "se" | undefined {
  if (hasAnnotation(annotations, ANNOTATION_IDS.BGM)) {
    return "bgm";
  }
  if (hasAnnotation(annotations, ANNOTATION_IDS.SE)) {
    return "se";
  }
  return payloadPurpose === "bgm" || payloadPurpose === "se" ? payloadPurpose : undefined;
}

function normalizeSceneEffectName(effectName: string | undefined): SceneEffectName | undefined {
  const normalized = effectName?.trim().toLowerCase();
  return normalized ? SCENE_EFFECT_ALIAS_MAP[normalized] : undefined;
}

export function getSceneEffectLabel(effectName: string | undefined): string | undefined {
  const normalized = normalizeSceneEffectName(effectName);
  return normalized ? SCENE_EFFECT_LABEL_MAP[normalized] : undefined;
}

export function getSceneEffectFromAnnotations(annotations: readonly string[] | undefined | null): SceneEffectName | undefined {
  const list = normalizeAnnotations(annotations);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const effectName = SCENE_EFFECT_NAME_BY_ANNOTATION[list[i]];
    if (effectName) {
      return effectName;
    }
  }
  return undefined;
}
