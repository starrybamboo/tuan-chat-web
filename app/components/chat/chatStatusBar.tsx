// 类型导入 (parent-type)
import type { ChatStatusType } from "../../../api/wsModels";
// 外部库
import React, { useMemo } from "react";
import UserIdToName from "@/components/chat/shared/components/userIdToName";

interface ChatStatusBarProps {
  roomId: number;
  userId: number | undefined | null;
  webSocketUtils: any;
  excludeSelf?: boolean;
}

/**
 * ChatStatusBar
 * 展示当前房间内其他成员的输入/等待/暂离状态。
 * - 优先级: input > wait > leave (idle 不显示)
 * - 同一状态多个用户合并展示: `3 人正在输入...`
 * - Hover / Tooltip: 展示所有用户名 (用换行分隔)
 */
export default function ChatStatusBar({ roomId, userId, webSocketUtils, excludeSelf = true }: ChatStatusBarProps) {
  const grouped = useMemo(() => {
    const statusPriority: ChatStatusType[] = ["input", "wait", "leave"]; // idle 不展示
    const raw = (webSocketUtils.chatStatus?.[roomId] ?? []) as { userId: number; status: ChatStatusType }[];
    const others = excludeSelf && userId != null ? raw.filter(s => s.userId !== userId) : raw;
    return statusPriority
      .map(st => ({
        type: st,
        users: others.filter(o => o.status === st).map(o => o.userId),
      }))
      .filter(g => g.users.length > 0);
  }, [excludeSelf, roomId, userId, webSocketUtils.chatStatus]);

  if (grouped.length === 0)
    return null;

  const renderLabel = (t: ChatStatusType) => {
    switch (t) {
      case "input": return "正在输入";
      case "wait": return "等待他人扮演"; // 更新文案
      case "leave": return "暂离";
      default: return t;
    }
  };

  // 与 ChatToolbar 状态选择器颜色保持一致
  const colorMap: Record<ChatStatusType, string> = {
    input: "text-info",
    wait: "text-warning",
    leave: "text-error",
    idle: "opacity-70", // 这里不会展示 idle，仅为类型完整
  };

  // 当前 RoomMember 类型不含 userName，暂以 #uid 占位；后续可通过 members 扩展或单独的用户缓存获取
  const resolveUserNameNode = (uid: number) => <UserIdToName userId={uid} className="inline" />;

  return (
    <div className="mb-1 -mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/80">
      {grouped.map((g) => {
        const nameNodes = g.users.map(resolveUserNameNode);
        const tooltipLines = g.users.map(u => `#${u}`).join("\n");
        const isSingle = nameNodes.length === 1;
        return (
          <div
            key={g.type}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-base-200 border border-base-300"
          >
            <span className={colorMap[g.type] || "text-base-content/70"}>
              <span className="tooltip tooltip-top whitespace-pre-line" data-tip={tooltipLines}>
                {isSingle
                  ? (
                      <>
                        {nameNodes[0]}
                        {" "}
                        {renderLabel(g.type)}
                        ...
                      </>
                    )
                  : (
                      <>
                        {nameNodes.map((n, idx) => (
                          <React.Fragment key={g.users[idx]}>
                            {n}
                            {idx < nameNodes.length - 1 && <span className="opacity-60 mx-0.5">、</span>}
                          </React.Fragment>
                        ))}
                        <span className="ml-1">
                          {renderLabel(g.type)}
                          ...
                        </span>
                      </>
                    )}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
