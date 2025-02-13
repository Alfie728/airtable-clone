import { QueryClient, isServer } from "@tanstack/react-query";

export const queryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute by default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
};

function makeQueryClient() {
  return new QueryClient(queryClientOptions);
}

// This ensures we have a single client instance across the app
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client to avoid cross-request state pollution
    return makeQueryClient();
  }

  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
