import { QueryClient } from "@tanstack/react-query";

export const mobileQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      refetchOnReconnect: true,
    },
  },
});
