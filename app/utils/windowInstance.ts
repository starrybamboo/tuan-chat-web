/**
 * 窗口实例管理工具
 * 用于多窗口环境下的实例标识和状态隔离
 */

// 生成唯一的窗口标识符
export function generateWindowId(): string {
  return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 全局窗口ID，在应用启动时生成
export const CURRENT_WINDOW_ID = generateWindowId();

// 状态更新间隔管理
const lastStatusUpdates = new Map<string, { timestamp: number; status: string; windowId: string }>();

// 存储每个房间-用户的活动状态
const activeStatusWindows = new Map<string, { windowId: string; timestamp: number; status: string }>();

/**
 * 检查是否应该发送状态更新
 * @param roomId 房间ID
 * @param userId 用户ID
 * @param newStatus 新状态
 * @param windowId 窗口ID
 * @returns 是否应该发送更新
 */
export function shouldSendStatusUpdate(
  roomId: number,
  userId: number,
  newStatus: string,
  windowId: string,
): boolean {
  const key = `${roomId}_${userId}`;
  const now = Date.now();
  const lastUpdate = lastStatusUpdates.get(key);
  const activeWindow = activeStatusWindows.get(key);

  // 状态优先级：input > wait > leave > idle
  const statusPriority = { input: 4, wait: 3, leave: 2, idle: 1 };
  const newPriority = statusPriority[newStatus as keyof typeof statusPriority] || 0;

  // 如果有其他窗口在活跃且其状态优先级更高，跳过这次更新
  if (activeWindow && activeWindow.windowId !== windowId) {
    const activePriority = statusPriority[activeWindow.status as keyof typeof statusPriority] || 0;

    // 如果其他窗口的状态优先级更高，且时间间隔较短（30秒内），跳过
    if (activePriority > newPriority && (now - activeWindow.timestamp < 30_000)) {
      return false;
    }

    // 如果是相同优先级的状态，且时间间隔较短（5秒内），跳过
    if (activePriority === newPriority && (now - activeWindow.timestamp < 5_000)) {
      return false;
    }
  }

  // 防抖逻辑：相同状态的更新间隔检查
  if (lastUpdate && lastUpdate.status === newStatus) {
    // 相同状态的更新，如果间隔太短则跳过
    const minInterval = newStatus === "input" ? 2000 : 3000; // input状态2秒间隔，其他3秒
    if (now - lastUpdate.timestamp < minInterval) {
      return false;
    }
  }

  // 记录状态更新
  lastStatusUpdates.set(key, { timestamp: now, status: newStatus, windowId });
  activeStatusWindows.set(key, { windowId, timestamp: now, status: newStatus });

  return true;
}

/**
 * 清理过期的状态记录
 */
export function cleanupExpiredStatusRecords(): void {
  const now = Date.now();
  const expireTime = 5 * 60 * 1000; // 5分钟过期

  // 清理状态更新记录
  for (const [key, record] of lastStatusUpdates.entries()) {
    if (now - record.timestamp > expireTime) {
      lastStatusUpdates.delete(key);
    }
  }

  // 清理活跃窗口记录
  for (const [key, record] of activeStatusWindows.entries()) {
    if (now - record.timestamp > expireTime) {
      activeStatusWindows.delete(key);
    }
  }
}

/**
 * 窗口失焦时调用，用于清理当前窗口的活跃状态
 * @param roomId 房间ID
 * @param userId 用户ID
 */
export function handleWindowBlur(roomId: number, userId: number): void {
  const key = `${roomId}_${userId}`;
  const activeWindow = activeStatusWindows.get(key);

  if (activeWindow && activeWindow.windowId === CURRENT_WINDOW_ID) {
    // 如果当前窗口是活跃窗口，将其标记为非活跃
    activeStatusWindows.delete(key);
  }
}

/**
 * 获取指定房间用户的当前活跃窗口
 * @param roomId 房间ID
 * @param userId 用户ID
 * @returns 活跃窗口信息或null
 */
export function getActiveWindow(roomId: number, userId: number): { windowId: string; timestamp: number; status: string } | null {
  const key = `${roomId}_${userId}`;
  return activeStatusWindows.get(key) || null;
}

// 定期清理过期记录
setInterval(cleanupExpiredStatusRecords, 60 * 1000); // 每分钟清理一次
