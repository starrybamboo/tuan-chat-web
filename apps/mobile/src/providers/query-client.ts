import { QueryClient } from "@tanstack/react-query";

export const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnReconnect: true,
    },
  },
});
