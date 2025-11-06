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
  const scale = avatar.spriteScale ? avatar.spriteScale : 1;
  const positionX = avatar.spriteXPosition ? avatar.spriteXPosition : 0;
  const positionY = avatar.spriteYPosition ? avatar.spriteYPosition : 0;
  const alpha = avatar.spriteTransparency ? avatar.spriteTransparency : 1;
  const rotation = avatar.spriteRotation ? avatar.spriteRotation : 0;

  // Validate and clamp values to acceptable ranges
  return {
    scale,
    positionX,
    positionY,
    alpha,
    rotation,
  };
};
