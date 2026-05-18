import {
  getRoomExtraQueryKey,
  useRoomExtra as useSharedRoomExtra,
} from "@tuanchat/query/room-extra";

import { mobileApiClient } from "@/lib/api";

/**
 * 读取并写入房间 extra，结构与 Web 端保持一致。
 */
export function useRoomExtra<T>(roomId: number | null, key: string, defaultValue: T) {
  return useSharedRoomExtra(mobileApiClient, roomId, key, defaultValue);
}

export { getRoomExtraQueryKey };
