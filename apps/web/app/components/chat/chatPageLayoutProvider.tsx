import type { ReactNode } from "react";
import type { ChatPageLayoutContextValue } from "@/components/chat/chatPageLayoutContext";
import { ChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";

export function ChatPageLayoutProvider({ value, children }: { value: ChatPageLayoutContextValue; children: ReactNode }) {
  return (
    <ChatPageLayoutContext value={value}>
      {children}
    </ChatPageLayoutContext>
  );
}
