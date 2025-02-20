import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import type { Column } from "~/types/table";
import { getTableStructure } from "~/lib/actions/tables.action";

interface TableStructureResponse {
  success: boolean;
  columns?: Column[];
  error?: string;
}

export function useTableStructure(tableId: string) {
  return useQuery<TableStructureResponse>({
    queryKey: queryKeys.tables.structure.columns(tableId),
    queryFn: async () => {
      const result = await getTableStructure(tableId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to fetch table columns");
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
