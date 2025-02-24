import { type QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";
import { getBaseById } from "~/lib/actions/bases.action";
import type { BaseResponse } from "~/types/base";
import { type tables } from "~/server/db/schema";
import { queryKeys } from "./keys";
import { getUserBases } from "~/lib/actions/bases.action";
import { getDefaultView, getTableViews } from "~/lib/actions/views.action";
import { getViewSorts } from "~/lib/actions/sort.action";
import type { TableResponse } from "~/types/table";

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

  // Prefetch table data
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.data.root(tableId),
    queryFn: () => getTableData({ tableId, tableName }),
    staleTime: 5 * 1000,
  });

  // Prefetch views list and default view
  await queryClient.prefetchQuery({
    queryKey: queryKeys.views.list(tableId),
    queryFn: async () => {
      const viewsResult = await getTableViews(tableId);

      if (viewsResult.success && viewsResult.views) {
        return viewsResult.views;
      }
      throw new Error(viewsResult.error ?? "Failed to get views");
    },
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

  // Prefetch base info
  void queryClient.prefetchQuery({
    queryKey: queryKeys.bases.info(baseId),
    queryFn: () => getBaseById(baseId),
    staleTime: 30 * 1000,
  });

  // Prefetch tables list
  void queryClient.prefetchQuery({
    queryKey: queryKeys.bases.tables.list(baseId),
    queryFn: async () => {
      const tablesResult = await getTables(baseId);

      if (tablesResult.success && tablesResult.tables) {
        // Start prefetching table data
        void Promise.all(
          tablesResult.tables.map((table) =>
            queryClient.prefetchQuery({
              queryKey: queryKeys.tables.data.root(table.id),
              queryFn: () =>
                getTableData({
                  tableId: table.id,
                  tableName: table.name,
                }),
              staleTime: 5 * 1000,
            }),
          ),
        );

        // Start prefetching views and sorts
        void Promise.all(
          tablesResult.tables.map(async (table) => {
            // Prefetch views list
            const viewsPromise = queryClient.prefetchQuery({
              queryKey: queryKeys.views.list(table.id),
              queryFn: async () => {
                const viewsResult = await getTableViews(table.id);
                const { viewId } = await getDefaultView(table.id);

                if (viewId) {
                  // Cache the default view ID
                  queryClient.setQueryData(
                    queryKeys.views.detail(viewId),
                    viewId,
                  );

                  // Prefetch sorts for the default view
                  void queryClient.prefetchQuery({
                    queryKey:
                      queryKeys.views.structure.configuration.sorts(viewId),
                    queryFn: async () => {
                      const result = await getViewSorts(viewId);
                      if (!result.success) {
                        throw new Error(
                          result.error ?? "Failed to get view sorts",
                        );
                      }
                      return result.sorts;
                    },
                    staleTime: 5 * 1000,
                  });
                }

                if (viewsResult.success && viewsResult.views) {
                  return viewsResult.views;
                }
                throw new Error(viewsResult.error ?? "Failed to get views");
              },
              staleTime: 5 * 1000,
            });

            return viewsPromise;
          }),
        );
      }

      return tablesResult;
    },
    staleTime: 10 * 1000,
  });
}

/**
 * Prefetches the list of bases for the current user
 * This is used for initial page load hydration
 */
export async function prefetchBasesList(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.bases.list(),
    queryFn: () => getUserBases(userId),
    staleTime: 10 * 1000,
  });
}
