import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import { getTableViews } from "~/lib/actions/views.action";
import type { views } from "~/server/db/schema";

export function useViews(tableId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.views.list(tableId),
    queryFn: async () => {
      const result = await getTableViews(tableId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to get views");
      }
      return result.views;
    },
  });

  return {
    views: data as (typeof views.$inferSelect)[] | undefined,
    isLoading,
    error,
  };
}
