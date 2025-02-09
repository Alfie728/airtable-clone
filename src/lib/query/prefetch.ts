import { QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";

// This function is specifically for prefetching
export async function prefetchTable(baseId: string, tableId: string) {
  const queryClient = new QueryClient();

  // First get the base data to get the table name
  const baseData = await getTables(baseId);
  const tableName = baseData.tables?.find((t) => t.id === tableId)?.name ?? "";

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["base", baseId],
      queryFn: () => getTables(baseId),
    }),
    queryClient.prefetchQuery({
      queryKey: ["table", tableId],
      queryFn: () => getTableData(tableId, tableName),
    }),
  ]);

  return queryClient;
}
