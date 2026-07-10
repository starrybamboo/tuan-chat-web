// 当前房间消息热态/渲染投影 key；完整历史的持久化 read model 仍由本地消息库承载。
export function getRoomMessagesQueryKey(roomId: number): readonly ["getHistoryMessages", number, 0] {
  return ["getHistoryMessages", roomId, 0] as const;
}
