import type { ChatMessageResponse } from "../../../../../api";

type LogMessageOrderChangeInput = {
  source: string;
  roomId: number | null;
  prevMessages: ChatMessageResponse[];
  nextMessages: ChatMessageResponse[];
  incomingMessageIds?: number[];
};

export function logMessageOrderChange(input: LogMessageOrderChangeInput): void {
  void input;
}
