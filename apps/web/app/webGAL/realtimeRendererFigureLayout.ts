import type { FigurePositionKey } from "@/types/voiceRenderTypes";

import { FIGURE_POSITION_IDS, FIGURE_POSITION_ORDER } from "@/types/voiceRenderTypes";

import type { RoleAvatar } from "../../api";

export const IMAGE_MESSAGE_FIGURE_ID = "image_message";
export const EFFECT_OFFSET_X = -200;
const WEBGAL_STAGE_WIDTH = 2560;
const WEBGAL_STAGE_HEIGHT = 1440;
export const EFFECT_SCREEN_WIDTH = WEBGAL_STAGE_WIDTH;
export const EFFECT_SCREEN_Y = WEBGAL_STAGE_HEIGHT * 0.25;
export const DEFAULT_KEEP_OFFSET_PART = " -keepOffset";
export const DEFAULT_RESTORE_TRANSFORM_PART = " -restoreTransform";

type FigureSlot = {
  id: string;
  basePosition: "left" | "center" | "right";
  offsetX: number;
  offsetY: number;
};

export type ImageFigureMessageShape = {
  width?: number;
  height?: number;
};

type ImageFigureLayout = {
  scale: number;
  offsetY: number;
};

const FIGURE_SLOT_OFFSET_X = 420;
const IMAGE_FIGURE_BASE_SCALE = 0.72;
const IMAGE_FIGURE_LANDSCAPE_SCALE = 0.84;
const IMAGE_FIGURE_SQUARE_SCALE = 0.62;
const IMAGE_FIGURE_ULTRA_PORTRAIT_SCALE = 0.78;
const IMAGE_FIGURE_BASE_OFFSET_Y = -180;
const IMAGE_FIGURE_LANDSCAPE_OFFSET_Y = -120;
const IMAGE_FIGURE_SQUARE_OFFSET_Y = -150;
const IMAGE_FIGURE_ULTRA_PORTRAIT_OFFSET_Y = -220;
const IMAGE_FIGURE_SAFE_TOP_Y = 80;
const IMAGE_FIGURE_SAFE_BOTTOM_Y = 1020;

const FIGURE_SLOT_MAP: Record<FigurePositionKey, FigureSlot> = {
  "left": {
    id: String(FIGURE_POSITION_IDS.left),
    basePosition: "left",
    offsetX: -FIGURE_SLOT_OFFSET_X * 2,
    offsetY: 0,
  },
  "left-center": {
    id: String(FIGURE_POSITION_IDS["left-center"]),
    basePosition: "left",
    offsetX: -FIGURE_SLOT_OFFSET_X,
    offsetY: 0,
  },
  "center": {
    id: String(FIGURE_POSITION_IDS.center),
    basePosition: "center",
    offsetX: 0,
    offsetY: 0,
  },
  "right-center": {
    id: String(FIGURE_POSITION_IDS["right-center"]),
    basePosition: "right",
    offsetX: FIGURE_SLOT_OFFSET_X,
    offsetY: 0,
  },
  "right": {
    id: String(FIGURE_POSITION_IDS.right),
    basePosition: "right",
    offsetX: FIGURE_SLOT_OFFSET_X * 2,
    offsetY: 0,
  },
};

export function resolveFigureSlot(position: FigurePositionKey): FigureSlot {
  return FIGURE_SLOT_MAP[position];
}

export function resolveSlotOffsetById(id: string): number | null {
  for (const slot of Object.values(FIGURE_SLOT_MAP)) {
    if (slot.id === id)
      return slot.offsetX;
  }
  return null;
}

export function resolveImageFigureLayout(imageMessage?: ImageFigureMessageShape | null): ImageFigureLayout {
  const width = Number(imageMessage?.width ?? 0);
  const height = Number(imageMessage?.height ?? 0);
  if (width <= 0 || height <= 0) {
    return { scale: IMAGE_FIGURE_BASE_SCALE, offsetY: IMAGE_FIGURE_BASE_OFFSET_Y };
  }
  const ratio = width / height;
  if (ratio >= 1.3) {
    return { scale: IMAGE_FIGURE_LANDSCAPE_SCALE, offsetY: IMAGE_FIGURE_LANDSCAPE_OFFSET_Y };
  }
  if (ratio >= 0.9) {
    return { scale: IMAGE_FIGURE_SQUARE_SCALE, offsetY: IMAGE_FIGURE_SQUARE_OFFSET_Y };
  }
  if (ratio <= 0.6) {
    return { scale: IMAGE_FIGURE_ULTRA_PORTRAIT_SCALE, offsetY: IMAGE_FIGURE_ULTRA_PORTRAIT_OFFSET_Y };
  }
  return { scale: IMAGE_FIGURE_BASE_SCALE, offsetY: IMAGE_FIGURE_BASE_OFFSET_Y };
}

function resolveImageFigureRenderedHeight(imageMessage: ImageFigureMessageShape | undefined, scale: number): number {
  const width = Number(imageMessage?.width ?? 0);
  const height = Number(imageMessage?.height ?? 0);
  if (width > 0 && height > 0) {
    const containScale = Math.min(WEBGAL_STAGE_WIDTH / width, WEBGAL_STAGE_HEIGHT / height);
    return height * containScale * scale;
  }
  return WEBGAL_STAGE_HEIGHT * scale;
}

export function clampImageFigureLayoutToSafeZone(
  imageMessage: ImageFigureMessageShape | undefined,
  layout: ImageFigureLayout,
): ImageFigureLayout {
  if (IMAGE_FIGURE_SAFE_TOP_Y >= IMAGE_FIGURE_SAFE_BOTTOM_Y) {
    return layout;
  }
  const safeHeight = IMAGE_FIGURE_SAFE_BOTTOM_Y - IMAGE_FIGURE_SAFE_TOP_Y;
  let scale = layout.scale;
  let renderedHeight = resolveImageFigureRenderedHeight(imageMessage, scale);
  if (!Number.isFinite(renderedHeight) || renderedHeight <= 0) {
    return layout;
  }

  if (renderedHeight > safeHeight) {
    scale *= safeHeight / renderedHeight;
    renderedHeight = safeHeight;
  }

  const baseCenterY = WEBGAL_STAGE_HEIGHT / 2 + layout.offsetY;
  const minCenterY = IMAGE_FIGURE_SAFE_TOP_Y + renderedHeight / 2;
  const maxCenterY = IMAGE_FIGURE_SAFE_BOTTOM_Y - renderedHeight / 2;
  const centerY = minCenterY <= maxCenterY
    ? Math.min(Math.max(baseCenterY, minCenterY), maxCenterY)
    : baseCenterY;

  return {
    scale,
    offsetY: centerY - WEBGAL_STAGE_HEIGHT / 2,
  };
}

export function buildFigureArgs(id: string, transform: string): string {
  const parts: string[] = [];
  const trimmedId = id.trim();
  if (trimmedId) {
    parts.push(`-id=${trimmedId}`);
  }
  if (transform) {
    parts.push(transform);
  }
  return parts.join(" ");
}

export function buildRoleFigureTransformString(
  avatar: RoleAvatar | undefined,
  offsetX = 0,
  offsetY = 0,
): string {
  if (!avatar && offsetX === 0 && offsetY === 0) {
    return "";
  }

  const spriteTransform = avatar?.spriteTransform;
  const rotationRad = spriteTransform?.rotation
    ? (spriteTransform.rotation * Math.PI / 180)
    : 0;

  const transform = {
    position: {
      x: (spriteTransform?.positionX ?? 0) + offsetX,
      y: (spriteTransform?.positionY ?? 0) + offsetY,
    },
    scale: {
      x: spriteTransform?.scale ?? 1,
      y: spriteTransform?.scale ?? 1,
    },
    alpha: spriteTransform?.alpha ?? 1,
    rotation: rotationRad,
  };
  return `-transform=${JSON.stringify(transform)}`;
}

export function buildImageFigureTransformString(
  imageMessage: ImageFigureMessageShape | undefined,
  offsetX = 0,
): string {
  const presetLayout = resolveImageFigureLayout(imageMessage);
  const layout = clampImageFigureLayoutToSafeZone(imageMessage, presetLayout);
  const transform = {
    position: {
      x: offsetX,
      y: layout.offsetY,
    },
    scale: {
      x: layout.scale,
      y: layout.scale,
    },
    alpha: 1,
    rotation: 0,
  };
  return `-transform=${JSON.stringify(transform)}`;
}

type ClearFigureOptions = {
  includeImage?: boolean;
};

export function buildClearFigureLines(options: ClearFigureOptions = {}): string[] {
  const { includeImage = false } = options;
  const lines = FIGURE_POSITION_ORDER.map((position) => {
    const slot = resolveFigureSlot(position);
    return `changeFigure:none -id=${slot.id} -next;`;
  });
  if (includeImage) {
    lines.push(`changeFigure:none -id=${IMAGE_MESSAGE_FIGURE_ID} -next;`);
  }
  return lines;
}

function buildDisableFigureEnterTransitionLines(): string[] {
  const targets = new Set<string>();
  FIGURE_POSITION_ORDER.forEach((position) => {
    targets.add(resolveFigureSlot(position).id);
  });
  targets.add(IMAGE_MESSAGE_FIGURE_ID);
  return Array.from(targets).map(target => `setTransition: -target=${target} -enter=none -keepOffset -next;`);
}

export function buildSceneInitLines(): string[] {
  return [
    "changeBg:none -next;",
    ...buildDisableFigureEnterTransitionLines(),
    ...buildClearFigureLines({ includeImage: true }),
  ];
}
