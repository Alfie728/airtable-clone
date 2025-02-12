import { type QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";
import { getBaseById } from "~/lib/actions/bases.action";
import type { BaseResponse } from "~/types/table";
import { type tables } from "~/server/db/schema";

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
  if (!tableId || !tableName) return;

  await queryClient.prefetchQuery({
    queryKey: ["table", tableId],
    queryFn: () => getTableData(tableId, tableName),
    staleTime: 5 * 1000,
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
  if (!baseId) return;

  // Prefetch base info first
  await queryClient.prefetchQuery({
    queryKey: ["base", baseId, "info"],
    queryFn: () => getBaseById(baseId),
    staleTime: 30 * 1000,
  });

  // Prefetch base tables
  await queryClient.prefetchQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    staleTime: 10 * 1000,
  });

  // Get base data from cache
  const baseData = queryClient.getQueryData<BaseResponse>(["base", baseId]);

  // Prefetch table data in parallel if we have tables
  if (baseData?.success && baseData.tables) {
    await Promise.all(
      baseData.tables.map((table) =>
        queryClient.prefetchQuery({
          queryKey: ["table", table.id],
          queryFn: () => getTableData(table.id, table.name),
          staleTime: 5 * 1000,
        }),
      ),
    );
  }
}
