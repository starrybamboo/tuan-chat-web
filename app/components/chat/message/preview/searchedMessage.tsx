import type { ChatMessageResponse } from "../../../../../api";
import React from "react";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";
import { useGetUserInfoQuery } from "../../../../../api/hooks/UserHooks";

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword)
    return <>{text}</>;

  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <>
      {parts.map(part =>
        part.toLowerCase() === keyword.toLowerCase()
          ? (
              <span key={part} className="bg-info/70 text-info-content rounded px-1">
                {part}
              </span>
            )
          : (
              part
            ),
      )}
    </>
  );
}
export default function SearchedMessage({
  message,
  keyword,
  onClick,
  className,
}: {
  message: ChatMessageResponse;
  keyword: string;
  onClick?: () => void;
  className?: string;
}) {
  const useRoleRequest = useGetRoleQuery(message.message.roleId ?? -1);
  const role = useRoleRequest.data?.data;
  const displayRoleName = getDisplayRoleName({
    roleId: message.message.roleId,
    roleName: role?.roleName,
    customRoleName: message.message.customRoleName,
    isIntroText: message.message.messageType === MESSAGE_TYPE.INTRO_TEXT,
  });
  const isOutOfCharacterText = message.message.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(message.message.content);
  const outOfCharacterUserQuery = useGetUserInfoQuery(message.message.userId, {
    enabled: isOutOfCharacterText && message.message.userId > 0,
  });
  const speakerDisplayName = isOutOfCharacterText
    ? (outOfCharacterUserQuery.data?.data?.username?.trim() || `用户${message.message.userId}`)
    : displayRoleName;
  return (
    <div className={`flex flex-col hover:bg-base-300 transition-colors ${className}`} onClick={onClick}>
      <div className="flex items-center gap-2">
        {isOutOfCharacterText
          ? (
              <UserAvatarByUser
                user={{
                  userId: message.message.userId,
                  username: outOfCharacterUserQuery.data?.data?.username,
                  avatarFileId: outOfCharacterUserQuery.data?.data?.avatarFileId,
                  avatarMediaType: outOfCharacterUserQuery.data?.data?.avatarMediaType,
                }}
                width={8}
                isRounded={true}
                stopToastWindow={true}
                clickEnterProfilePage={false}
              />
            )
          : (
              <RoleAvatarComponent
                avatarId={message.message.avatarId ?? -1}
                width={8}
                isRounded={true}
                stopToastWindow
                withTitle={true}
              >
              </RoleAvatarComponent>
            )}
        <div className="font-medium text-sm">
          <div className="flex items-center gap-2">
            {isOutOfCharacterText && (
              <span className="inline-flex items-center rounded-full border border-warning/45 bg-warning/18 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-warning">
                场外
              </span>
            )}
            <HighlightText
              text={speakerDisplayName}
              keyword={keyword}
            />
          </div>
          <span className="text-xs opacity-70 ml-2">
            {new Date(message.message.createTime || "").toLocaleString()}
          </span>
        </div>
      </div>

      <div className={`mt-2 text-sm pl-10 ${isOutOfCharacterText ? "italic text-base-content/75" : ""}`}>
        <HighlightText
          text={message.message.content}
          keyword={keyword}
        />
      </div>

      {message.message.replyMessageId && (
        <div className="pl-10 flex flex-row gap-2 py-1">
          <span className="opacity-60 inline flex-shrink-0 text-sm">| 回复</span>
          <PreviewMessage
            message={message.message.replyMessageId}
          >
          </PreviewMessage>
        </div>
      )}
    </div>
  );
}
