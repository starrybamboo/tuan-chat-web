import type { Message } from "../../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import BetterImg from "@/components/common/betterImg";
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
  return (
    <div className={className}>
      <button
        onClick={() => roomContext.setReplyMessage && roomContext.setReplyMessage(undefined)}
        className="size-4 opacity-70 transition-opacity hover:bg-base-300"
        type="button"
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <span className="opacity-60 inline flex-shrink-0">回复</span>
      <span className="text-sm line-clamp-3 opacity-60 break-words flex flex-col">
        {role?.roleName || "YOU_KNOW_WHO"}
        {": "}
        {isTextMessage ? replyMessage.content : <BetterImg src={replyMessage.extra?.imageMessage?.url} className="size-15" />}
      </span>
    </div>
  );
}
