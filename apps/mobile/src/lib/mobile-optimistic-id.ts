const OPTIMISTIC_ID_BUCKET_SIZE = 1000;

/** 根据当前时间生成与历史小负数区间隔离的乐观消息 ID 起点。 */
export function createMobileOptimisticMessageIdSeed(now: number = Date.now()): number {
  return -Math.max(1, Math.floor(now)) * OPTIMISTIC_ID_BUCKET_SIZE;
}

let nextMobileOptimisticMessageId = createMobileOptimisticMessageIdSeed();

/** 为当前进程内的私聊和房间消息生成唯一负数 ID。 */
export function createMobileOptimisticMessageId(): number {
  return nextMobileOptimisticMessageId--;
}
