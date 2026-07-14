// 外部库
import React, { useMemo, useState } from "react";

import { DEFAULT_CHAT_STATUS_LABELS, normalizeChatStatusDescription, readChatStatusLabelsFromLocalStorage } from "@/components/chat/chatStatusLabels";
import { RoomContext } from "@/components/chat/core/roomContext";
import TypingIndicator from "@/components/chat/message/typingIndicator";
import WaitingIndicator from "@/components/chat/message/waitingIndicator";
import UserIdToName from "@/components/chat/shared/components/userIdToName";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
import PortalTooltip from "@/components/common/portalTooltip";

// 类型导入 (parent-type)
import type { ChatStatusPayload, ChatStatusType } from "../../../api/wsModels";

type ChatStatusBarProps = {
  roomId: number;
  userId: number | undefined | null;
  webSocketUtils: any;
  excludeSelf?: boolean;
  showGrouped?: boolean;
  showGroupDivider?: boolean;
  className?: string;
  currentChatStatus?: ChatStatusType;
  onChangeChatStatus?: (status: ChatStatusType) => void;
  isSpectator?: boolean;
  compact?: boolean;
}

const CHAT_STATUS_SELECTOR_OPTIONS = [
  {
    value: "idle",
    desc: "清除正在输入",
    textClass: "text-base-content/70",
  },
  {
    value: "input",
    desc: "标记正在输入",
    textClass: "text-info",
  },
  {
    value: "wait",
    desc: "等待他人行动",
    textClass: "text-warning",
  },
  {
    value: "leave",
    desc: "临时离开",
    textClass: "text-error",
  },
] as const;

type ChatStatusGroup = {
  type: ChatStatusType;
  description: string;
  users: number[];
};

/**
 * ChatStatusBar
 * 展示当前房间内其他成员的输入/等待/暂时离开状态。
 * - 优先级: input > wait > leave (idle 不显示)
 * - 同一状态多个用户合并展示: `3 人正在输入...`
 * - Hover / Tooltip: 展示所有用户名 (用换行分隔)
 */
export default function ChatStatusBar({
  roomId,
  userId,
  webSocketUtils,
  excludeSelf = true,
  showGrouped = true,
  showGroupDivider = true,
  className,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator = false,
  compact = false,
}: ChatStatusBarProps) {
  const roomContext = React.use(RoomContext);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [statusLabels] = useState(() => readChatStatusLabelsFromLocalStorage());
  const grouped = useMemo(() => {
    if (!showGrouped) {
      return [];
    }
    const statusPriority: ChatStatusType[] = ["input", "wait", "leave"]; // idle 不展示
    const raw = (webSocketUtils.chatStatus?.[roomId] ?? []) as { userId: number; status: ChatStatusPayload }[];
    const others = excludeSelf && userId != null ? raw.filter(s => s.userId !== userId) : raw;
    const groups = new Map<string, ChatStatusGroup>();
    for (const item of others) {
      if (item.status.type === "idle") {
        continue;
      }
      const description = normalizeChatStatusDescription(item.status.type, item.status.description);
      const key = `${item.status.type}:${description}`;
      const group = groups.get(key);
      if (group) {
        group.users.push(item.userId);
        continue;
      }
      groups.set(key, {
        type: item.status.type,
        description,
        users: [item.userId],
      });
    }
    return [...groups.values()].sort((left, right) => {
      const priorityDiff = statusPriority.indexOf(left.type) - statusPriority.indexOf(right.type);
      return priorityDiff || left.description.localeCompare(right.description, "zh-Hans-CN");
    });
  }, [excludeSelf, roomId, showGrouped, userId, webSocketUtils.chatStatus]);

  const roomMemberNameById = useMemo(() => new Map(
    roomContext.roomMembers
      .filter(member => typeof member.userId === "number" && Boolean(member.username?.trim()))
      .map(member => [member.userId!, member.username!.trim()]),
  ), [roomContext.roomMembers]);

  const showSelector = !isSpectator && currentChatStatus && onChangeChatStatus;
  if (grouped.length === 0 && !showSelector)
    return null;

  const renderLabel = (t: ChatStatusType) => {
    switch (t) {
      case "input": return statusLabels.input;
      case "wait": return statusLabels.wait;
      case "leave": return statusLabels.leave;
      case "idle": return statusLabels.idle;
      default: return t;
    }
  };

  const renderStatusMotionLabel = (t: ChatStatusType, description?: string) => {
    const label = description ?? renderLabel(t);
    switch (t) {
      case "input":
        return (
          <TypingIndicator
            name={label}
            compact
          />
        );
      case "wait":
        return <WaitingIndicator name={label} compact />;
      case "leave":
        return <span className="text-[11px] text-error">{label}</span>;
      default:
        return label;
    }
  };

  // 与 ChatToolbar 状态选择器颜色保持一致
  const colorMap: Record<ChatStatusType, string> = {
    input: "text-info",
    wait: "text-warning",
    leave: "text-error",
    idle: "opacity-70", // 这里不会展示 idle，仅为类型完整
  };

  const resolveUserNameNode = (uid: number) => {
    const username = roomMemberNameById.get(uid);
    return username ?? <UserIdToName userId={uid} className="inline" />;
  };

  return (
    <div className={`
      ${compact ? "my-0" : "mb-1 -mt-1"}
      flex flex-wrap items-center gap-x-3 text-xs text-base-content/80
      ${className ?? ""}
    `}>
      {showSelector && (
        <DropdownMenu
          ariaLabel="切换聊天状态"
          placement="top-start"
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          className="pointer-events-auto"
          menuClassName="w-32 gap-1 p-2 text-sm shadow-md"
          trigger={(
            <button
              type="button"
              aria-label="切换聊天状态"
              className={`
                min-w-0 cursor-pointer list-none flex items-center text-xs
                select-none gap-1 hover:text-info
              `}
              onClick={event => event.stopPropagation()}
              title="切换聊天状态"
            >
              {currentChatStatus === "idle"
                ? <span className="opacity-70">{statusLabels.idle}</span>
                : renderStatusMotionLabel(currentChatStatus)}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`
                  size-3 opacity-60 transition-transform duration-150
                  ${selectorOpen ? "rotate-180" : ""}
                `}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.173l3.71-3.942a.75.75 0 111.08 1.04l-4.25 4.516a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        >
          {CHAT_STATUS_SELECTOR_OPTIONS.map(item => (
            <li key={item.value} role="none">
              <MenuItem
                title={item.desc}
                selected={currentChatStatus === item.value}
                className={`justify-center py-1.5 text-center ${item.textClass}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChangeChatStatus(item.value);
                  setSelectorOpen(false);
                }}
              >
                <span className="w-full text-center leading-none">{DEFAULT_CHAT_STATUS_LABELS[item.value]}</span>
              </MenuItem>
            </li>
          ))}
        </DropdownMenu>
      )}
      {showSelector && grouped.length > 0 && (
        <span className="h-3 w-px bg-base-content/20" aria-hidden />
      )}
      {grouped.map((g, groupIndex) => {
        const nameNodes = g.users.map(resolveUserNameNode);
        const tooltipLines = g.users.map(u => `#${u}`).join("\n");
        const isSingle = nameNodes.length === 1;
        return (
          <span key={`${g.type}:${g.description}`} className={colorMap[g.type] || `
            text-base-content/70
          `}>
            <PortalTooltip content={<span className="whitespace-pre-line">{tooltipLines}</span>} placement="top">
              {isSingle
                ? (
                    <>
                      {nameNodes[0]}
                      {" "}
                      {renderStatusMotionLabel(g.type, g.description)}
                    </>
                  )
                : (
                    <>
                      {nameNodes.map((n, idx) => (
                        <React.Fragment key={g.users[idx]}>
                          {n}
                          {idx < nameNodes.length - 1 && <span className="
                            opacity-60 mx-0.5
                          ">、</span>}
                        </React.Fragment>
                      ))}
                      <span className="ml-1">
                        {renderStatusMotionLabel(g.type, g.description)}
                      </span>
                    </>
                  )}
            </PortalTooltip>
            {showGroupDivider && groupIndex < grouped.length - 1 && <span className="
              opacity-50 mx-2
            ">/</span>}
          </span>
        );
      })}
    </div>
  );
}
