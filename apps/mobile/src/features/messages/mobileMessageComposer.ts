export const MOBILE_MESSAGE_MODE = {
  COMMAND_REQUEST: "commandRequest",
  TEXT: "text",
} as const;

export type MobileMessageMode = typeof MOBILE_MESSAGE_MODE[keyof typeof MOBILE_MESSAGE_MODE];

export function canMobileMessageModeUseAttachments(mode: MobileMessageMode) {
  return mode === MOBILE_MESSAGE_MODE.TEXT;
}

export function getMobileMessageModeLabel(mode: MobileMessageMode) {
  switch (mode) {
    case MOBILE_MESSAGE_MODE.COMMAND_REQUEST:
      return "指令请求";
    case MOBILE_MESSAGE_MODE.TEXT:
    default:
      return "文本";
  }
}
