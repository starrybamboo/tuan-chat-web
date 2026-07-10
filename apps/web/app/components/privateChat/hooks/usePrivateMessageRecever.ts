import type { MessageDirectResponse } from "@tuanchat/openapi-client/models/MessageDirectResponse";

import { useMemo } from "react";

import { useGetUserInfoQuery } from "api/hooks/UserHooks";

export function usePrivateMessageReceiver(userId: number, currentContactUserId: number | null, historyMessages: MessageDirectResponse[]) {
  void userId;

  // 当前联系人信息
  const currentContactUserInfo = useGetUserInfoQuery(currentContactUserId || -1).data?.data;

  const allMessages = useMemo(() => {
    return historyMessages.filter(msg => msg.messageType !== 10000);
  }, [historyMessages]);

  return { currentContactUserId, currentContactUserInfo, allMessages };
}
