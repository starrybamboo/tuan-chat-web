import type { Message } from "../../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import { XMarkICon } from "@/icons";
import React, { use } from "react";
import { useGetRoleQuery } from "../../../../api/queryHooks";

/**
 * 回复的消息
 * @param replyMessage 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用。
 * @param className className
 * @constructor
 */
export default function RepliedMessage({ replyMessage, className }: {
  replyMessage: Message;
  className?: string;
}) {
  const roomContext = use(RoomContext);
  const role = useGetRoleQuery(replyMessage.roleId).data?.data;
  const isTextMessage = replyMessage.messageType === 1;
  const scrollToGivenMessage = roomContext.scrollToGivenMessage;
  const imgMsg = replyMessage.extra?.imageMessage;
  return (
    <div className={className} onClick={() => scrollToGivenMessage && scrollToGivenMessage(replyMessage.messageID)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          roomContext.setReplyMessage && roomContext.setReplyMessage(undefined);
        }}
        className="size-4 opacity-70 transition-opacity hover:bg-base-300"
        type="button"
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <span className="opacity-60 inline flex-shrink-0">回复</span>
      {
        isTextMessage
          ? (
              <span className="text-sm line-clamp-3 opacity-60 break-words">
                {role?.roleName || "YOU_KNOW_WHO"}
                {": "}
                {replyMessage.content}
              </span>
            )
          : (
              <span className="text-sm line-clamp-3 opacity-60 break-words flex flex-row items-center">
                {role?.roleName || "YOU_KNOW_WHO"}
                {": "}
                <img
                  src={replyMessage.extra?.imageMessage?.url}
                  className="size-8 object-contain"
                  alt="img"
                  width={imgMsg?.width}
                  height={imgMsg?.height}
                />
              </span>
            )
      }
    </div>
  );
}
