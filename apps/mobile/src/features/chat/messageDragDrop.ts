import type { Message } from "@tuanchat/openapi-client/models/Message";

export type MessageDropPlacement = "after" | "before";

export type MessageDropCandidate = {
  height: number;
  message: Message;
  pageY: number;
};

export function resolveMessageDropTarget(params: {
  candidates: readonly MessageDropCandidate[];
  draggingMessageId: number;
  pointerPageY: number;
}): { message: Message; placement: MessageDropPlacement } | null {
  let closest: { distance: number; message: Message; placement: MessageDropPlacement } | null = null;

  for (const candidate of params.candidates) {
    const messageId = candidate.message.messageId;
    if (typeof messageId !== "number" || messageId === params.draggingMessageId) {
      continue;
    }

    const centerY = candidate.pageY + candidate.height / 2;
    const distance = Math.abs(params.pointerPageY - centerY);
    if (closest && closest.distance <= distance) {
      continue;
    }

    closest = {
      distance,
      message: candidate.message,
      placement: params.pointerPageY < centerY ? "before" : "after",
    };
  }

  return closest ? { message: closest.message, placement: closest.placement } : null;
}
