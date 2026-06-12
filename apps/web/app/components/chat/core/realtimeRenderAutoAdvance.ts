import type { ChatMessageResponse } from "../../../../api";

function toFinitePosition(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getMaxRenderedMessagePosition(messages: ChatMessageResponse[]): number | null {
  let maxPosition: number | null = null;
  messages.forEach((entry) => {
    const position = toFinitePosition(entry.message.position);
    if (position == null) {
      return;
    }
    maxPosition = maxPosition == null ? position : Math.max(maxPosition, position);
  });
  return maxPosition;
}

export function shouldAutoAdvanceAppendedMessage(params: {
  enabled: boolean;
  message: ChatMessageResponse;
  previousMaxPosition: number | null;
}): boolean {
  if (!params.enabled) {
    return false;
  }
  const position = toFinitePosition(params.message.message.position);
  if (position == null) {
    return false;
  }
  return params.previousMaxPosition == null || position > params.previousMaxPosition;
}
