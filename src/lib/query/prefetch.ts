import { QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";
import { getQueryClient } from "./client";

// This function is specifically for prefetching
export async function prefetchTable(baseId: string, tableId: string) {
  const queryClient = getQueryClient();

  // First get the base data to get the table name
  const { tables } = await queryClient.fetchQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    staleTime: Infinity,
  });

  const tableName = tables?.find((t) => t.id === tableId)?.name ?? "";

  // Prefetch and cache the table data
  const tableData = await queryClient.fetchQuery({
    queryKey: ["table", tableId],
    queryFn: () => getTableData(tableId, tableName),
    staleTime: Infinity,
  });

  return tableData;
}

// This function is for prefetching just the tables of a base
export async function prefetchBaseTables(baseId: string) {
  const queryClient = getQueryClient();

  // Fetch the base tables
  const { success, tables } = await queryClient.fetchQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
  });

  // If we have tables, prefetch each table's data
  if (success && tables) {
    await Promise.all(
      tables.map((table) =>
        queryClient.fetchQuery({
          queryKey: ["table", table.id],
          queryFn: () => getTableData(table.id, table.name),
        }),
      ),
    );
  }
}
