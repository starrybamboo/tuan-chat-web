import type { ChatMessageResponse } from "../../../../../api";
import React from "react";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { useGetRoleQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";

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
  return (
    <div className={`flex flex-col hover:bg-base-300 transition-colors ${className}`} onClick={onClick}>
      <div className="flex items-center gap-2">
        <RoleAvatarComponent avatarId={message.message.avatarId ?? -1} width={8} isRounded={true} stopToastWindow withTitle={true}></RoleAvatarComponent>
        <div className="font-medium text-sm">
          <HighlightText
            text={displayRoleName}
            keyword={keyword}
          />
          <span className="text-xs opacity-70 ml-2">
            {new Date(message.message.createTime || "").toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-2 text-sm pl-10">
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
