import type { ChatMessageResponse } from "../../../../api";
import { PreviewMessage } from "@/components/chat/smallComponents/previewMessage";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import React from "react";
import { useGetRoleQuery } from "../../../../api/queryHooks";

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword)
    return <>{text}</>;

  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase()
          ? (
              <span key={i} className="bg-info/70 text-info-content rounded px-1">
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
}: {
  message: ChatMessageResponse;
  keyword: string;
  onClick?: () => void;
}) {
  const useRoleRequest = useGetRoleQuery(message.message.roleId);
  const role = useRoleRequest.data?.data;
  return (
    <div className="flex flex-col hover:bg-base-300/70 rounded-lg transition-colors" onClick={onClick}>
      <div className="flex items-center gap-2">
        <RoleAvatarComponent avatarId={message.message.avatarId} width={8} isRounded={true} stopPopWindow withTitle={true}></RoleAvatarComponent>
        <div className="font-medium text-sm">
          {role?.roleName}
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
