import { QueryClient } from "@tanstack/react-query";

// Ensure we only create one instance during SSR
let queryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // During SSR, we want to keep data fresh
          staleTime: Infinity,
        },
      },
    });
  }
  return queryClient;
}
