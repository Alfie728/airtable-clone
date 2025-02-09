"use client";

import { useQuery } from "@tanstack/react-query";
import { getBaseById } from "~/lib/actions/bases.action";

export const useBase = (baseId: string) => {
  const baseQuery = useQuery({
    queryKey: ["base", baseId, "info"],
    queryFn: () => getBaseById(baseId),
    enabled: Boolean(baseId),
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  return {
    baseName: baseQuery.data?.name ?? "Untitled Base",
    isLoading: baseQuery.isLoading,
    error: baseQuery.error,
  };
};
