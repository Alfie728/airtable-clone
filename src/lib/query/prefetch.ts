import { type QueryClient } from "@tanstack/react-query";
import { getTables, getTableData } from "~/lib/actions/tables.action";
import { getBaseById } from "~/lib/actions/bases.action";
import { queryKeys } from "./keys";
import { getUserBases } from "~/lib/actions/bases.action";
import { getDefaultView, getTableViews } from "~/lib/actions/views.action";

// Constants for stale times
const STALE_TIMES = {
  BASE_INFO: 60 * 1000, // 1 minute
  TABLES_LIST: 30 * 1000, // 30 seconds
  TABLE_DATA: 10 * 1000, // 10 seconds
  VIEWS_LIST: 10 * 1000, // 10 seconds
  DEFAULT_VIEW: 10 * 1000, // 10 seconds
} as const;

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
    staleTime: STALE_TIMES.TABLE_DATA,
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
    staleTime: STALE_TIMES.VIEWS_LIST,
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
    staleTime: STALE_TIMES.BASE_INFO,
  });

  // Prefetch tables list
  void queryClient.prefetchQuery({
    queryKey: queryKeys.bases.tables.list(baseId),
    queryFn: async () => {
      const tablesResult = await getTables(baseId);

      if (tablesResult.success && tablesResult.tables) {
        // Get the first table to prefetch its default view
        const firstTable = tablesResult.tables[0];
        if (firstTable) {
          // Prefetch default view for the first table immediately
          const defaultViewPromise = getDefaultView(firstTable.id).then(
            ({ viewId }) => {
              if (viewId) {
                // Cache both the default view ID and the views list
                queryClient.setQueryData(
                  queryKeys.views.default(firstTable.id),
                  viewId,
                );
                return queryClient.prefetchQuery({
                  queryKey: queryKeys.views.list(firstTable.id),
                  queryFn: async () => {
                    const viewsResult = await getTableViews(firstTable.id);
                    if (viewsResult.success && viewsResult.views) {
                      return viewsResult.views;
                    }
                    throw new Error(viewsResult.error ?? "Failed to get views");
                  },
                  staleTime: STALE_TIMES.VIEWS_LIST,
                });
              }
            },
          );

          // Start prefetching table data and views in parallel
          await Promise.all([
            defaultViewPromise,
            queryClient.prefetchQuery({
              queryKey: queryKeys.tables.data.root(firstTable.id),
              queryFn: () =>
                getTableData({
                  tableId: firstTable.id,
                  tableName: firstTable.name,
                }),
              staleTime: STALE_TIMES.TABLE_DATA,
            }),
          ]);
        }

        // Then prefetch the rest of the tables in the background
        void Promise.all(
          tablesResult.tables.slice(1).map((table) =>
            Promise.all([
              queryClient.prefetchQuery({
                queryKey: queryKeys.tables.data.root(table.id),
                queryFn: () =>
                  getTableData({
                    tableId: table.id,
                    tableName: table.name,
                  }),
                staleTime: STALE_TIMES.TABLE_DATA,
              }),
              queryClient.prefetchQuery({
                queryKey: queryKeys.views.list(table.id),
                queryFn: async () => {
                  const viewsResult = await getTableViews(table.id);
                  const { viewId } = await getDefaultView(table.id);

                  if (viewId) {
                    // Cache the default view ID
                    queryClient.setQueryData(
                      queryKeys.views.default(table.id),
                      viewId,
                    );
                  }

                  if (viewsResult.success && viewsResult.views) {
                    return viewsResult.views;
                  }
                  throw new Error(viewsResult.error ?? "Failed to get views");
                },
                staleTime: STALE_TIMES.VIEWS_LIST,
              }),
            ]),
          ),
        );
      }

      return tablesResult;
    },
    staleTime: STALE_TIMES.TABLES_LIST,
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
