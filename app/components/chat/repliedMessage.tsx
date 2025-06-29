import type { Message } from "../../../api";
import { PreviewMessage } from "@/components/chat/forwardMessage";
import { RoomContext } from "@/components/chat/roomContext";
import { XMarkICon } from "@/icons";
import React, { use } from "react";

/**
 * 回复的消息
 * @param replyMessage 可以是Message对象或消息ID 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用。
 * @param className className
 * @constructor
 */
export default function RepliedMessage({ replyMessage, className }: {
  replyMessage: Message | number; // 允许message为id)
  className?: string;
}) {
  const roomContext = use(RoomContext);
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
      <PreviewMessage
        message={replyMessage}
        className=""
      >
      </PreviewMessage>
    </div>
  );
}
