import type { RoleAvatar } from "api";

import type { Transform } from "./TransformControl";

export function parseTransformFromAvatar(avatar: RoleAvatar | null): Transform {
  if (!avatar) {
    return {
      scale: 1,
      positionX: 0,
      positionY: 0,
      alpha: 1,
      rotation: 0,
    };
  }

  // Parse transform parameters from string values, with fallbacks to defaults
  const scale = avatar.spriteScale ? Number.parseFloat(avatar.spriteScale) : 1;
  const positionX = avatar.spriteXPosition ? Number.parseFloat(avatar.spriteXPosition) : 0;
  const positionY = avatar.spriteYPosition ? Number.parseFloat(avatar.spriteYPosition) : 0;
  const alpha = avatar.spriteTransparency ? Number.parseFloat(avatar.spriteTransparency) : 1;
  const rotation = avatar.spriteRotation ? Number.parseFloat(avatar.spriteRotation) : 0;

  // Validate and clamp values to acceptable ranges
  return {
    scale: Math.max(0, Math.min(2, Number.isNaN(scale) ? 1 : scale)),
    positionX: Math.max(-300, Math.min(300, Number.isNaN(positionX) ? 0 : positionX)),
    positionY: Math.max(-300, Math.min(300, Number.isNaN(positionY) ? 0 : positionY)),
    alpha: Math.max(0, Math.min(1, Number.isNaN(alpha) ? 1 : alpha)),
    rotation: Math.max(0, Math.min(360, Number.isNaN(rotation) ? 0 : rotation)),
  };
};
