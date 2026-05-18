import type { Message } from "@tuanchat/openapi-client/models/Message";

import { getMessageAuthorLabel } from "./display-labels";
import { getMessagePreviewText } from "./messagePreview";

export function buildMessageSearchText(message: Message): string {
  const parts = [
    getMessageAuthorLabel(message),
    getMessagePreviewText(message),
    `消息 #${message.messageId ?? "-"}`,
  ];

  return parts.join(" ").toLocaleLowerCase("zh-CN");
}
