import { type QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";
import { getQueryClient } from "./client";
import type { tables } from "~/server/db/schema";

type TableType = typeof tables.$inferSelect;

interface TableColumn {
  id: string;
  name: string;
  type: string;
  order: number;
  width: number;
  isSearchable: boolean;
  isSortable: boolean;
  isVisible: boolean;
}

type GetTablesResponse = {
  success: boolean;
  tables?: TableType[];
  error?: string;
};

type GetTableDataResponse = {
  success: boolean;
  table?: {
    id: string;
    name: string;
    columns: TableColumn[];
    data: Record<string, string | number>[];
  };
  error?: string;
};

/**
 * Prefetches a single table's data
 */
export async function prefetchTable(
  queryClient: QueryClient,
  tableId: string,
  tableName: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: ["table", tableId],
    queryFn: () => getTableData(tableId, tableName),
  });
}

/**
 * Prefetches all tables for a base and their data
 * This is typically used for hover prefetching on the home page
 */
export async function prefetchBaseTables(
  queryClient: QueryClient,
  baseId: string,
): Promise<void> {
  // First prefetch the base tables
  await queryClient.prefetchQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
  });

  // Get the tables data from cache
  const tablesData = queryClient.getQueryData<GetTablesResponse>([
    "base",
    baseId,
  ]);

  // If we have tables, prefetch each table's data
  if (tablesData?.success && tablesData.tables) {
    await Promise.all(
      tablesData.tables.map((table) =>
        prefetchTable(queryClient, table.id, table.name),
      ),
    );
  }
}
