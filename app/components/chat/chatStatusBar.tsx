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
  className?: string;
  currentChatStatus?: ChatStatusType | "idle";
  onChangeChatStatus?: (status: ChatStatusType | "idle") => void;
  isSpectator?: boolean;
}

/**
 * ChatStatusBar
 * 展示当前房间内其他成员的输入/等待/暂离状态。
 * - 优先级: input > wait > leave (idle 不显示)
 * - 同一状态多个用户合并展示: `3 人正在输入...`
 * - Hover / Tooltip: 展示所有用户名 (用换行分隔)
 */
export default function ChatStatusBar({
  roomId,
  userId,
  webSocketUtils,
  excludeSelf = true,
  className,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator = false,
}: ChatStatusBarProps) {
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

  const showSelector = !isSpectator && currentChatStatus && onChangeChatStatus;
  if (grouped.length === 0 && !showSelector)
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
    <div className={`mb-1 -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/80 ${className ?? ""}`}>
      <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-base-200 border border-base-300">
        {showSelector && (
          <div className="dropdown dropdown-top pointer-events-auto">
            <div
              role="button"
              tabIndex={0}
              aria-label="切换聊天状态"
              className="min-w-0 cursor-pointer list-none flex items-center text-xs select-none gap-1 hover:text-info"
              title="切换聊天状态"
            >
              <span
                className={
                  currentChatStatus === "input"
                    ? "text-info"
                    : currentChatStatus === "wait"
                      ? "text-warning"
                      : currentChatStatus === "leave" ? "text-error" : "opacity-70"
                }
              >
                {currentChatStatus === "idle" && "空闲"}
                {currentChatStatus === "input" && "输入中"}
                {currentChatStatus === "wait" && "等待扮演"}
                {currentChatStatus === "leave" && "暂离"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.173l3.71-3.942a.75.75 0 111.08 1.04l-4.25 4.516a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box w-36 p-2 shadow-md border border-base-200 gap-1 text-sm z-[9999] absolute"
            >
              {[
                { value: "idle", label: "空闲", desc: "清除正在输入" },
                { value: "input", label: "输入中", desc: "标记正在输入" },
                { value: "wait", label: "等待扮演", desc: "等待他人行动" },
                { value: "leave", label: "暂离", desc: "临时离开" },
              ].map(item => (
                <li key={item.value}>
                  <a
                    className={`flex flex-col gap-0.5 py-1 ${currentChatStatus === item.value ? "active bg-base-200" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChangeChatStatus(item.value as any);
                      const elem = document.activeElement as HTMLElement;
                      if (elem) {
                        elem.blur();
                      }
                    }}
                  >
                    <span className="leading-none">{item.label}</span>
                    <span className="text-[10px] opacity-60 leading-none">{item.desc}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {grouped.length > 0 && (
          <span className="h-3 w-px bg-base-content/20" aria-hidden />
        )}
        {grouped.map((g, groupIndex) => {
          const nameNodes = g.users.map(resolveUserNameNode);
          const tooltipLines = g.users.map(u => `#${u}`).join("\n");
          const isSingle = nameNodes.length === 1;
          return (
            <span key={g.type} className={colorMap[g.type] || "text-base-content/70"}>
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
              {groupIndex < grouped.length - 1 && <span className="opacity-50 mx-2">/</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
