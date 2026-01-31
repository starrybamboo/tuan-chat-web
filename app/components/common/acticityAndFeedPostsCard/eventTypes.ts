// 事件处理
const EventTypes = {
  0: "ERROR",
  2: "", // 发布了Feed
  3: "COMMENT_AND_FOLLOW", // 关注事件
  4: "PLAY", // 游玩事件
  5: "发布了模组", // 模组事件
  6: "MODULE_FORK", // 模组分支事件
  7: "CONTRIBUTE", // 模组 PR 贡献事件
  8: "COLLECT_MODULE", // 收藏模组事件
  9: "COLLECT_POST", // 收藏文章事件
  10: "发布了帖子", // 发布帖子事件
  11: "LAUNCH_PLAY", // 启动游戏事件
  12: "", // 动态发布事件
} as const;

type EventTypeId = keyof typeof EventTypes;

export function parseEventType(type: number): string {
  return EventTypes[type as EventTypeId] ?? "ERROR";
}

