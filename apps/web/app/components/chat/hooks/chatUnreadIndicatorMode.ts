export function getPrivateEntryBadgeLoadMode(enableBadge: boolean, isPrivateChatMode: boolean) {
  return {
    loadFullPrivateData: enableBadge && isPrivateChatMode,
    loadSummary: enableBadge && !isPrivateChatMode,
  };
}

export function resolvePrivateEntryBadgeCount(params: {
  isPrivateChatMode: boolean;
  privateUnreadCount: number;
  pendingFriendRequestCount: number;
  summaryDirectUnreadCount: number;
  summaryPendingFriendRequestCount: number;
}) {
  if (params.isPrivateChatMode) {
    return params.privateUnreadCount + params.pendingFriendRequestCount;
  }
  return params.summaryDirectUnreadCount + params.summaryPendingFriendRequestCount;
}
