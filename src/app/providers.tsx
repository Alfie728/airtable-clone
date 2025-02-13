"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthRedirect } from "~/components/auth/AuthRedirect";
import { Toaster } from "sonner";
import { getQueryClient } from "~/lib/query/client";
import { type ReactNode } from "react";

// This ensures we have a single provider instance across the app
const queryClient = getQueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthRedirect />
      {children}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
