type TimelineMessageLike = {
  createTime?: string | null;
  messageId?: number;
};

export type PrivateChatTimelineEntry<T extends TimelineMessageLike> = (
  | { type: "date-divider"; label: string }
  | { type: "message"; message: T; messageIndex: number }
);

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getTimeValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? null : time;
}

export function formatPrivateChatDateLabel(value: string | null | undefined, now = new Date()): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const currentKey = getLocalDateKey(now);
  const targetKey = getLocalDateKey(parsed);
  if (targetKey === currentKey) {
    return "今天";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetKey === getLocalDateKey(yesterday)) {
    return "昨天";
  }

  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

export function buildPrivateChatTimelineEntries<T extends TimelineMessageLike>(
  messages: readonly T[],
  now = new Date(),
): PrivateChatTimelineEntry<T>[] {
  const entries: PrivateChatTimelineEntry<T>[] = [];
  let previousTime: number | null = null;
  let previousDateKey: string | null = null;
  const dividerGapMs = 6 * 60 * 60 * 1000;

  for (const [messageIndex, message] of messages.entries()) {
    const rawTime = message.createTime ?? null;
    const timeValue = getTimeValue(rawTime);
    const dateKey = timeValue !== null ? getLocalDateKey(new Date(timeValue)) : null;

    const shouldShowDivider = (
      dateKey !== null
      && previousDateKey !== null
      && dateKey !== previousDateKey
      && previousTime !== null
      && timeValue !== null
      && (timeValue - previousTime) >= dividerGapMs
    );

    if (shouldShowDivider) {
      entries.push({
        type: "date-divider",
        label: formatPrivateChatDateLabel(rawTime, now),
      });
    }

    entries.push({
      type: "message",
      message,
      messageIndex,
    });

    if (dateKey !== null) {
      previousDateKey = dateKey;
    }
    if (timeValue !== null) {
      previousTime = timeValue;
    }
  }

  return entries;
}
