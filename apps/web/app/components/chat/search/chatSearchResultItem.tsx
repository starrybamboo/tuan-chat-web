import { ArrowSquareOutIcon } from "@phosphor-icons/react";

import type { ChatMessageResponse, SpaceMember, UserRole } from "api";

import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import { splitChatMessageHighlight } from "./chatMessageSearch";

function HighlightedText({ text, query }: { text: string; query: string }) {
  return splitChatMessageHighlight(text, query).map((part, index) => (
    part.matched
      ? (
          <mark key={`${index}:${part.text}`} className="rounded-sm bg-warning/35 px-0.5 text-base-content">
            {part.text}
          </mark>
        )
      : <span key={`${index}:${part.text}`}>{part.text}</span>
  ));
}

type ChatSearchResultItemProps = {
  message: ChatMessageResponse;
  query: string;
  role?: UserRole;
  member?: SpaceMember;
  onSelect: () => void;
};

export default function ChatSearchResultItem({
  message,
  query,
  role,
  member,
  onSelect,
}: ChatSearchResultItemProps) {
  const data = message.message;
  const isOutOfCharacterText = data.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(data.content);
  const roleName = getDisplayRoleName({
    roleId: data.roleId,
    roleName: role?.roleName,
    customRoleName: data.customRoleName,
    isIntroText: data.messageType === MESSAGE_TYPE.INTRO_TEXT,
    zeroRoleIsNarrator: true,
    fallback: "未知角色",
  });
  const speakerName = isOutOfCharacterText
    ? (member?.username?.trim() || `用户${data.userId}`)
    : (roleName || "旁白");
  const timeLabel = data.createTime ? formatTimeSmartly(data.createTime) : "";

  return (
    <button
      type="button"
      className="group flex w-full gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-base-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info/25 sm:px-5"
      aria-label={`定位${speakerName}${timeLabel ? `在${timeLabel}` : ""}发送的消息`}
      onClick={onSelect}
    >
      <div className="mt-0.5 shrink-0">
        {isOutOfCharacterText
          ? (
              <UserAvatarByUser
                user={{
                  userId: data.userId,
                  username: member?.username,
                  avatarFileId: member?.avatarFileId,
                  avatarMediaType: member?.avatarMediaType,
                }}
                width={9}
                isRounded
                stopToastWindow
                clickEnterProfilePage={false}
              />
            )
          : (
              <RoleAvatarComponent
                avatarId={data.avatarId ?? role?.avatarId ?? -1}
                width={9}
                isRounded
                stopToastWindow
              />
            )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-base-content">
            <HighlightedText text={speakerName} query={query} />
          </span>
          {isOutOfCharacterText ? <span className="text-xs font-medium text-warning">场外</span> : null}
          {timeLabel ? <time className="text-xs tabular-nums text-base-content/45">{timeLabel}</time> : null}
        </div>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-base-content/80">
          <HighlightedText text={data.content} query={query} />
        </p>
        {data.replyMessageId
          ? <div className="mt-2 text-xs text-base-content/45">回复消息 #{data.replyMessageId}</div>
          : null}
      </div>

      <ArrowSquareOutIcon
        className="mt-1 size-4 shrink-0 text-base-content/25 transition-colors group-hover:text-info"
        aria-hidden="true"
      />
    </button>
  );
}
