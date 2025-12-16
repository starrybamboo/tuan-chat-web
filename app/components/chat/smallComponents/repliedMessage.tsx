import type { Message } from "../../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
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
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const role = useGetRoleQuery(replyMessage.roleId ?? -1).data?.data;
  const isTextMessage = replyMessage.messageType === 1;
  const scrollToGivenMessage = roomContext.scrollToGivenMessage;
  const imgMsg = replyMessage.extra?.imageMessage;
  return (
    <div className={className} onClick={() => scrollToGivenMessage && scrollToGivenMessage(replyMessage.messageId)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setReplyMessage(undefined);
        }}
        aria-label="取消回复"
        title="取消回复"
        className="size-4 opacity-70 transition-opacity hover:bg-base-300"
        type="button"
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <span className="opacity-60 inline flex-shrink-0">回复</span>
      {isTextMessage
        ? (
            <span className="text-sm line-clamp-3 opacity-60 break-words">
              {role?.roleName || "未命名角色"}
              {": "}
              {replyMessage.content}
            </span>
          )
        : replyMessage.extra?.imageMessage?.url
          ? (
              <span className="text-sm line-clamp-3 opacity-60 break-words flex flex-row items-center">
                {role?.roleName || "未命名角色"}
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
          : (
              <span className="text-sm line-clamp-3 opacity-60 break-words">
                {role?.roleName || "未命名角色"}
                {": "}
                非文本内容
              </span>
            )}
    </div>
  );
}
