import type { Message } from "../../../api";
import { PreviewMessage } from "@/components/chat/forwardMessage";
import { RoomContext } from "@/components/chat/roomContext";
import { XMarkICon } from "@/icons";
import React, { use } from "react";

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
      >
        <XMarkICon className="size-4"></XMarkICon>
      </button>
      <span className="opacity-70">回复</span>
      <PreviewMessage
        message={replyMessage}
        className="flex flex-row gap-3 opacity-50"
        showData={false}
      >
      </PreviewMessage>
    </div>
  );
}
