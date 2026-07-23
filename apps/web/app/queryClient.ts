import { QueryClient } from "@tanstack/react-query";

import { resetRoomHistoryQueryRuntime } from "@/components/chat/infra/localDb/roomHistoryQueryCache";
import { resetRoomMessageEditorSyncEntries } from "@/components/chat/infra/localDb/roomMessageEditSyncRegistry";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export function resetTuanChatQueryCache(): void {
  resetRoomMessageEditorSyncEntries(queryClient);
  resetRoomHistoryQueryRuntime(queryClient);
  queryClient.clear();
}
