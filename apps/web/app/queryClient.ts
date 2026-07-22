import { QueryClient } from "@tanstack/react-query";

import { resetRoomHistoryQueryRuntime } from "@/components/chat/infra/localDb/roomHistoryQueryCache";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export function resetTuanChatQueryCache(): void {
  resetRoomHistoryQueryRuntime(queryClient);
  queryClient.clear();
}
