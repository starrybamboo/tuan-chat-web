export const MOBILE_MESSAGE_MODE = {
  COMMAND_REQUEST: "commandRequest",
  STATE_EVENT: "stateEvent",
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
    case MOBILE_MESSAGE_MODE.STATE_EVENT:
      return "状态事件";
    case MOBILE_MESSAGE_MODE.TEXT:
    default:
      return "文本";
  }
}

export function getMobileMessageInputPlaceholder(mode: MobileMessageMode) {
  switch (mode) {
    case MOBILE_MESSAGE_MODE.COMMAND_REQUEST:
      return "输入命令文本，例如 .ra 侦查";
    case MOBILE_MESSAGE_MODE.STATE_EVENT:
      return "输入 .st hp -2 或 .next";
    case MOBILE_MESSAGE_MODE.TEXT:
    default:
      return "先用真实接口发一条消息";
  }
}

export function getMobileMessageModeHint(mode: MobileMessageMode) {
  switch (mode) {
    case MOBILE_MESSAGE_MODE.COMMAND_REQUEST:
      return "会发送结构化 commandRequest，当前默认允许所有成员点击执行。";
    case MOBILE_MESSAGE_MODE.STATE_EVENT:
      return "当前支持 .next，发送 .st 时需要填写角色 ID。";
    case MOBILE_MESSAGE_MODE.TEXT:
    default:
      return "可选回复某条消息，也支持图片 / 视频 / 音频附件；角色 ID 为空时按普通用户发送。";
  }
}

export function getMobileMessageSubmitLabel(mode: MobileMessageMode) {
  switch (mode) {
    case MOBILE_MESSAGE_MODE.COMMAND_REQUEST:
      return "发送指令请求";
    case MOBILE_MESSAGE_MODE.STATE_EVENT:
      return "发送状态事件";
    case MOBILE_MESSAGE_MODE.TEXT:
    default:
      return "发送消息";
  }
}
