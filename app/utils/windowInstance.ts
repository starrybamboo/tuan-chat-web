/**
 * 绐楀彛瀹炰緥绠＄悊宸ュ叿
 * 鐢ㄤ簬澶氱獥鍙ｇ幆澧冧笅鐨勫疄渚嬫爣璇嗗拰鐘舵€侀殧绂?
 */

// 鐢熸垚鍞竴鐨勭獥鍙ｆ爣璇嗙
function generateWindowId(): string {
  return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 鍏ㄥ眬绐楀彛ID锛屽湪搴旂敤鍚姩鏃剁敓鎴?
export const CURRENT_WINDOW_ID = generateWindowId();

// 鐘舵€佹洿鏂伴棿闅旂鐞?
const lastStatusUpdates = new Map<string, { timestamp: number; status: string; windowId: string }>();

// 瀛樺偍姣忎釜鎴块棿-鐢ㄦ埛鐨勬椿鍔ㄧ姸鎬?
const activeStatusWindows = new Map<string, { windowId: string; timestamp: number; status: string }>();

/**
 * 妫€鏌ユ槸鍚﹀簲璇ュ彂閫佺姸鎬佹洿鏂?
 * @param roomId 鎴块棿ID
 * @param userId 鐢ㄦ埛ID
 * @param newStatus 鏂扮姸鎬?
 * @param windowId 绐楀彛ID
 * @returns 鏄惁搴旇鍙戦€佹洿鏂?
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

  // 鐘舵€佷紭鍏堢骇锛歩nput > wait > leave > idle
  const statusPriority = { input: 4, wait: 3, leave: 2, idle: 1 };
  const newPriority = statusPriority[newStatus as keyof typeof statusPriority] || 0;

  // 濡傛灉鏈夊叾浠栫獥鍙ｅ湪娲昏穬涓斿叾鐘舵€佷紭鍏堢骇鏇撮珮锛岃烦杩囪繖娆℃洿鏂?
  if (activeWindow && activeWindow.windowId !== windowId) {
    const activePriority = statusPriority[activeWindow.status as keyof typeof statusPriority] || 0;

    // 濡傛灉鍏朵粬绐楀彛鐨勭姸鎬佷紭鍏堢骇鏇撮珮锛屼笖鏃堕棿闂撮殧杈冪煭锛?0绉掑唴锛夛紝璺宠繃
    if (activePriority > newPriority && (now - activeWindow.timestamp < 30_000)) {
      return false;
    }

    // 濡傛灉鏄浉鍚屼紭鍏堢骇鐨勭姸鎬侊紝涓旀椂闂撮棿闅旇緝鐭紙5绉掑唴锛夛紝璺宠繃
    if (activePriority === newPriority && (now - activeWindow.timestamp < 5_000)) {
      return false;
    }
  }

  // 闃叉姈閫昏緫锛氱浉鍚岀姸鎬佺殑鏇存柊闂撮殧妫€鏌?
  if (lastUpdate && lastUpdate.status === newStatus) {
    // 鐩稿悓鐘舵€佺殑鏇存柊锛屽鏋滈棿闅斿お鐭垯璺宠繃
    const minInterval = newStatus === "input" ? 2000 : 3000; // input鐘舵€?绉掗棿闅旓紝鍏朵粬3绉?
    if (now - lastUpdate.timestamp < minInterval) {
      return false;
    }
  }

  // 璁板綍鐘舵€佹洿鏂?
  lastStatusUpdates.set(key, { timestamp: now, status: newStatus, windowId });
  activeStatusWindows.set(key, { windowId, timestamp: now, status: newStatus });

  return true;
}

/**
 * 娓呯悊杩囨湡鐨勭姸鎬佽褰?
 */
function cleanupExpiredStatusRecords(): void {
  const now = Date.now();
  const expireTime = 5 * 60 * 1000; // 5鍒嗛挓杩囨湡

  // 娓呯悊鐘舵€佹洿鏂拌褰?
  for (const [key, record] of lastStatusUpdates.entries()) {
    if (now - record.timestamp > expireTime) {
      lastStatusUpdates.delete(key);
    }
  }

  // 娓呯悊娲昏穬绐楀彛璁板綍
  for (const [key, record] of activeStatusWindows.entries()) {
    if (now - record.timestamp > expireTime) {
      activeStatusWindows.delete(key);
    }
  }
}

/**
 * 绐楀彛澶辩劍鏃惰皟鐢紝鐢ㄤ簬娓呯悊褰撳墠绐楀彛鐨勬椿璺冪姸鎬?
 * @param roomId 鎴块棿ID
 * @param userId 鐢ㄦ埛ID
 */
export function handleWindowBlur(roomId: number, userId: number): void {
  const key = `${roomId}_${userId}`;
  const activeWindow = activeStatusWindows.get(key);

  if (activeWindow && activeWindow.windowId === CURRENT_WINDOW_ID) {
    // 濡傛灉褰撳墠绐楀彛鏄椿璺冪獥鍙ｏ紝灏嗗叾鏍囪涓洪潪娲昏穬
    activeStatusWindows.delete(key);
  }
}

/**
 * 鑾峰彇鎸囧畾鎴块棿鐢ㄦ埛鐨勫綋鍓嶆椿璺冪獥鍙?
 * @param roomId 鎴块棿ID
 * @param userId 鐢ㄦ埛ID
 * @returns 娲昏穬绐楀彛淇℃伅鎴杗ull
 */

// 瀹氭湡娓呯悊杩囨湡璁板綍
setInterval(cleanupExpiredStatusRecords, 60 * 1000); // 姣忓垎閽熸竻鐞嗕竴娆?
