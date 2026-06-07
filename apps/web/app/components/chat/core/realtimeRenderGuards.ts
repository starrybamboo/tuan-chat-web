type InitialHistoryRenderGuardInput = {
  isRealtimeActive: boolean;
  hasRenderedHistory: boolean;
  isRenderingHistory: boolean;
  hasHistoryMessages: boolean;
  chatHistoryLoading: boolean;
  hasRoom: boolean;
};

type SettingsRerenderGuardInput = {
  hasChanges: boolean;
  isRealtimeActive: boolean;
  hasHistoryMessages: boolean;
  hasRenderedHistory: boolean;
  isRenderingHistory: boolean;
};

type HistoryDeltaGuardInput = {
  isRealtimeActive: boolean;
  chatHistoryLoading: boolean;
  hasRenderedHistory: boolean;
  isRenderingHistory: boolean;
  hasHistoryMessages: boolean;
};

/**
 * 是否应触发首次历史消息渲染。
 * 说明：这里刻意不依赖 websocket connected 状态，因为历史渲染是文件写入流程。
 */
export function shouldRenderInitialHistory(input: InitialHistoryRenderGuardInput): boolean {
  return input.isRealtimeActive
    && !input.hasRenderedHistory
    && !input.isRenderingHistory
    && input.hasHistoryMessages
    && !input.chatHistoryLoading
    && input.hasRoom;
}

/**
 * 是否应在渲染设置变更后触发全量重渲染。
 * 说明：设置变更不能被连接状态吞掉，否则断线期间的变更会丢失。
 */
export function shouldRerenderForSettingsChange(input: SettingsRerenderGuardInput): boolean {
  if (!input.hasChanges || !input.isRealtimeActive || !input.hasHistoryMessages) {
    return false;
  }
  return input.hasRenderedHistory || input.isRenderingHistory;
}

/**
 * 是否应处理历史消息顺序/内容变更。
 * 说明：同样不绑定 websocket 状态，保持脚本文件与消息源一致。
 */
export function shouldProcessHistoryDelta(input: HistoryDeltaGuardInput): boolean {
  return input.isRealtimeActive
    && !input.chatHistoryLoading
    && input.hasRenderedHistory
    && !input.isRenderingHistory
    && input.hasHistoryMessages;
}
