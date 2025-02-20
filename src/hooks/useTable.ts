"use client";

import {
  useQueryClient,
  useQuery,
  useMutation,
  useQueries,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { useRef, useEffect, useMemo, useCallback } from "react";
import {
  getTableData,
  addRow,
  addCell,
  addBulkRows,
  renameTable,
  deleteTableAction,
} from "~/lib/actions/tables.action";
import type {
  Row,
  Column,
  TableResponse,
  SerializedTable,
  TableRenameResponse,
} from "~/types/table";
import { useBase } from "./useBase";
import { queryKeys } from "~/lib/query/keys";

// Add proper type for the server action response
type DeleteTableResponse = { success: boolean; error?: string };

function generateMockRow(columns: Column[]): Row {
  const row: Row = {
    id: crypto.randomUUID(),
    order: 0, // Will be updated with correct order when adding to table data
  };

  columns.forEach((column) => {
    if (column.type === "text") {
      row[column.id] = generateTextValue(column.name.toLowerCase());
    } else if (column.type === "number") {
      row[column.id] = generateNumberValue(column.name.toLowerCase());
    }
  });

  return row;
}

function generateTextValue(columnName: string): string {
  switch (columnName) {
    case "name":
      return faker.person.fullName();
    case "notes":
      return faker.lorem.sentence();
    case "email":
      return faker.internet.email();
    case "phone":
      return faker.phone.number({ style: "national" });
    case "company":
      return faker.company.name();
    case "city":
      return faker.location.city();
    default:
      return faker.lorem.word();
  }
}

function generateNumberValue(columnName: string): number {
  switch (columnName) {
    case "age":
      return faker.number.int({ min: 18, max: 80 });
    case "price":
      return faker.number.float({ min: 1, max: 1000, fractionDigits: 2 });
    default:
      return faker.number.int({ min: 0, max: 100 });
  }
}

interface RenameContext {
  previousTables?: {
    success: boolean;
    tables: SerializedTable[];
  };
  previousTableData?: TableResponse;
}

interface DeleteContext {
  previousTableData?: TableResponse;
  previousTables?: {
    success: boolean;
    tables: SerializedTable[];
  };
}

// function isTableRenameResponse(value: unknown): value is TableRenameResponse {
//   if (
//     typeof value === "object" &&
//     value !== null &&
//     "success" in value &&
//     typeof (value as { success: unknown }).success === "boolean"
//   ) {
//     const response = value as {
//       success: boolean;
//       error?: unknown;
//       table?: unknown;
//     };
//     if (!response.success) {
//       return (
//         typeof response.error === "undefined" ||
//         typeof response.error === "string"
//       );
//     }
//     if (response.table) {
//       const table = response.table as Record<string, unknown>;
//       return (
//         typeof table.id === "string" &&
//         typeof table.name === "string" &&
//         typeof table.baseId === "string" &&
//         (table.description === null || typeof table.description === "string") &&
//         typeof table.rowCount === "number" &&
//         table.createdAt instanceof Date &&
//         (table.updatedAt === null || table.updatedAt instanceof Date)
//       );
//     }
//     return true;
//   }
//   return false;
// }

type TableQueryResponse =
  | {
      success: true;
      table: {
        id: string;
        name: string;
        columns: Column[];
        data: Row[];
        pagination: {
          page: number;
          hasMore: boolean;
        };
      };
    }
  | {
      success: false;
      error: string;
    };

export const useTable = (baseId: string, tableId: string) => {
  const queryClient = useQueryClient();
  const latestMutationRef = useRef<string | null>(null);
  const pendingRowCreationsRef = useRef<Map<string, Promise<unknown>>>(
    new Map(),
  );
  const rowIdMappingRef = useRef<Map<string, string>>(new Map());

  console.log("[useTable] Initializing with:", { baseId, tableId });

  const { tables } = useBase(baseId);
  console.log("[useTable] Tables from useBase:", {
    tablesExists: !!tables,
    tablesLength: tables?.length,
    tableIds: tables?.map((t) => t.id),
  });

  // Use infinite query for table data
  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error: queryError,
  } = useInfiniteQuery<TableQueryResponse, Error>({
    queryKey: queryKeys.tables.data.root(tableId),
    queryFn: async ({ pageParam }) => {
      if (!tables) throw new Error("Tables not loaded yet");
      console.log("[useTable] Fetching page:", { pageParam });

      const table = tables.find((t) => t.id === tableId);
      if (!table) throw new Error(`Table ${tableId} not found`);

      const response = await getTableData(
        tableId,
        table.name,
        pageParam as number,
      );

      if (!response.success) {
        throw new Error(response.error ?? "Failed to fetch table data");
      }

      return response as TableQueryResponse;
    },
    getNextPageParam: (lastPage: TableQueryResponse) => {
      if (!lastPage.success || !lastPage.table?.pagination?.hasMore) {
        console.log("[useTable] No more pages:", {
          success: lastPage.success,
          hasMore: lastPage.success ? lastPage.table.pagination.hasMore : false,
        });
        return undefined;
      }

      const nextPage = lastPage.table.pagination.page + 1;
      console.log("[useTable] Next page:", { nextPage });
      return nextPage;
    },
    initialPageParam: 1,
    enabled: Boolean(tableId && tables && tables.length > 0),
    staleTime: Infinity, // Never consider data stale automatically
    gcTime: Infinity, // Keep data in cache indefinitely
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
  });

  // Log query status with more details
  // console.log("[useTable] Query status:", {
  //   isLoading: status === "pending",
  //   hasError: status === "error",
  //   errorMessage: queryError?.message,
  //   hasData: !!pages,
  //   pagesCount: pages?.pages?.length,
  //   enabled: Boolean(tableId && tables && tables.length > 0),
  //   tableId,
  //   baseId,
  //   tablesCount: tables?.length,
  // });

  // Combine all pages of data
  const tableData = useMemo(() => {
    if (!pages?.pages || pages.pages.length === 0) return undefined;

    const firstPage = pages.pages[0];
    if (!firstPage?.success) return undefined;

    // Combine data from all pages
    const allData = pages.pages.reduce<Row[]>((acc, page) => {
      if (page?.success) {
        return [...acc, ...page.table.data];
      }
      return acc;
    }, []);

    console.log("[useTable] Combined data:", {
      totalPages: pages.pages.length,
      totalRows: allData.length,
      hasMore: hasNextPage,
    });

    return {
      ...firstPage.table,
      data: allData,
    };
  }, [pages?.pages, hasNextPage]);

  const addRowMutation = useMutation({
    mutationFn: async (optimisticRow: Row) => {
      latestMutationRef.current = "addRow";
      const promise = addRow(tableId, optimisticRow);
      pendingRowCreationsRef.current.set(optimisticRow.id, promise);
      const result = await promise;
      if (result.success && result.row && "id" in result.row) {
        rowIdMappingRef.current.set(optimisticRow.id, result.row.id);
      }
      return result;
    },
    onMutate: async (optimisticRow) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.data.root(tableId),
      });
      const previousData = queryClient.getQueryData<
        InfiniteData<TableQueryResponse>
      >(queryKeys.tables.data.root(tableId));

      if (previousData?.pages[0]?.success) {
        // Get the highest order using reduce - more efficient for large datasets
        const maxOrder = previousData.pages.reduce((max, page) => {
          if (!page.success) return max;
          return Math.max(max, ...page.table.data.map((row) => row.order));
        }, -1);

        // Set the optimistic row's order to be after all existing rows
        const rowWithOrder = {
          ...optimisticRow,
          order: maxOrder + 1,
        };

        // Update all pages that contain the table data
        queryClient.setQueryData<InfiniteData<TableQueryResponse>>(
          queryKeys.tables.data.root(tableId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) => {
                if (!page.success) return page;
                if (index === 0) {
                  return {
                    ...page,
                    table: {
                      ...page.table,
                      data: [...page.table.data, rowWithOrder],
                    },
                  };
                }
                return page;
              }),
            };
          },
        );
      }

      return { previousData, optimisticRow };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.data.root(tableId),
          context.previousData,
        );
      }
      if (context?.optimisticRow) {
        pendingRowCreationsRef.current.delete(context.optimisticRow.id);
        rowIdMappingRef.current.delete(context.optimisticRow.id);
      }
    },
    onSettled: (data, _, variables) => {
      pendingRowCreationsRef.current.delete(variables.id);
      // Don't invalidate queries here - let the user manually refresh if needed
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: async (params: {
      rowId: string;
      columnId: string;
      value: string;
    }) => {
      const MAX_RETRIES = 5;
      const INITIAL_DELAY = 1000;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          const pendingCreation = pendingRowCreationsRef.current.get(
            params.rowId,
          );
          if (pendingCreation) {
            try {
              await pendingCreation;
              return addCell(params.rowId, params.columnId, params.value);
            } catch (error) {
              throw error instanceof Error ? error : new Error(String(error));
            }
          }

          latestMutationRef.current = "updateCell";
          const result = await addCell(
            params.rowId,
            params.columnId,
            params.value,
          );

          if (!result.success) {
            if (result.error?.includes("Row not found")) {
              retryCount++;
              if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_DELAY * Math.pow(2, retryCount - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
            }
            throw new Error(result.error ?? "Cell update failed");
          }

          return result;
        } catch (error) {
          if (retryCount === MAX_RETRIES - 1) {
            throw error;
          }
          retryCount++;
          const delay = INITIAL_DELAY * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new Error("Max retries exceeded");
    },
    onMutate: async (params) => {
      if (!pendingRowCreationsRef.current.has(params.rowId)) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.tables.data.root(tableId),
        });
      }

      const previousData = queryClient.getQueryData<
        InfiniteData<TableQueryResponse>
      >(queryKeys.tables.data.root(tableId));

      if (previousData?.pages[0]?.success) {
        queryClient.setQueryData<InfiniteData<TableQueryResponse>>(
          queryKeys.tables.data.root(tableId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => {
                if (!page.success) return page;
                return {
                  ...page,
                  table: {
                    ...page.table,
                    data: page.table.data.map((row) => {
                      if (row.id === params.rowId) {
                        return {
                          ...row,
                          [params.columnId]: params.value,
                        };
                      }
                      return row;
                    }),
                  },
                };
              }),
            };
          },
        );
      }

      return { previousData, params };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.data.root(tableId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Don't invalidate queries here - let the user manually refresh if needed
    },
  });

  const addBulkRowsMutation = useMutation({
    mutationFn: async (params: { optimisticRows: Row[] }) => {
      latestMutationRef.current = "addBulkRows";
      const promise = addBulkRows(tableId, params.optimisticRows);
      params.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.set(row.id, promise);
      });

      const result = await promise;

      params.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.delete(row.id);
      });

      return result;
    },
    onMutate: async (params: { optimisticRows: Row[] }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.data.root(tableId),
      });
      const previousData = queryClient.getQueryData<
        InfiniteData<TableQueryResponse>
      >(queryKeys.tables.data.root(tableId));

      if (previousData?.pages[0]?.success) {
        // Get the highest order using reduce - more efficient for large datasets
        const maxOrder = previousData.pages.reduce((max, page) => {
          if (!page.success) return max;
          return Math.max(max, ...page.table.data.map((row) => row.order));
        }, -1);

        // Set the optimistic rows' orders to be sequential after all existing rows
        const rowsWithOrder = params.optimisticRows.map((row, index) => ({
          ...row,
          order: maxOrder + 1 + index,
        }));

        // Update all pages that contain the table data
        queryClient.setQueryData<InfiniteData<TableQueryResponse>>(
          queryKeys.tables.data.root(tableId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) => {
                if (!page.success) return page;
                if (index === 0) {
                  return {
                    ...page,
                    table: {
                      ...page.table,
                      data: [...page.table.data, ...rowsWithOrder],
                    },
                  };
                }
                return page;
              }),
            };
          },
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.data.root(tableId),
          context.previousData,
        );
      }
      variables.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.delete(row.id);
      });
    },
    onSettled: () => {
      // Don't invalidate queries here - let the user manually refresh if needed
    },
  });

  const renameMutation = useMutation<
    TableRenameResponse,
    Error,
    string,
    RenameContext
  >({
    mutationFn: async (newName: string): Promise<TableRenameResponse> => {
      latestMutationRef.current = "renameTable";
      // We know this is a TableRenameResponse because that's what the server action returns
      const result = await renameTable(tableId, newName);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to rename table");
      }
      return result;
    },
    onMutate: async (newName) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.data.root(tableId),
      });

      // Snapshot the previous value
      const previousTables = queryClient.getQueryData<{
        success: boolean;
        tables: SerializedTable[];
      }>(queryKeys.bases.tables.list(baseId));

      // Optimistically update tables list
      if (previousTables?.tables) {
        queryClient.setQueryData(queryKeys.bases.tables.list(baseId), {
          ...previousTables,
          tables: previousTables.tables.map((table) =>
            table.id === tableId ? { ...table, name: newName } : table,
          ),
        });
      }

      // Optimistically update table detail
      const previousTableData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.data.root(tableId),
      );

      if (previousTableData?.table) {
        queryClient.setQueryData(queryKeys.tables.data.root(tableId), {
          ...previousTableData,
          table: {
            ...previousTableData.table,
            name: newName,
          },
        });
      }

      return { previousTables, previousTableData };
    },
    onError: (error: Error, newName, context) => {
      // Revert optimistic updates on error
      if (context?.previousTables) {
        queryClient.setQueryData(
          queryKeys.bases.tables.list(baseId),
          context.previousTables,
        );
      }
      if (context?.previousTableData) {
        queryClient.setQueryData(
          queryKeys.tables.data.root(tableId),
          context.previousTableData,
        );
      }
    },
    onSettled: () => {
      // We don't need to do anything here because the server action already invalidates the queries
    },
  });

  const deleteTableMutation = useMutation<
    DeleteTableResponse,
    Error,
    void,
    DeleteContext
  >({
    mutationFn: async () => {
      const startTime = Date.now();
      console.log("[Client] Delete mutation started");
      latestMutationRef.current = "deleteTable";

      try {
        console.log("[Client] About to call server action with params:", {
          baseId,
          tableId,
          timestamp: new Date().toISOString(),
          timeSinceStart: `${Date.now() - startTime}ms`,
        });

        const result = await deleteTableAction(baseId, tableId);

        console.log("[Client] Server action returned:", {
          result,
          timestamp: new Date().toISOString(),
          timeSinceStart: `${Date.now() - startTime}ms`,
        });

        if (!result) {
          console.error("[Client] Server action returned no result");
          throw new Error("No response from server");
        }

        if (!result.success) {
          console.error("[Client] Server action failed:", result.error);
          throw new Error(result.error ?? "Failed to delete table");
        }

        return result;
      } catch (error) {
        console.error("[Client] Delete mutation error:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          timeSinceStart: `${Date.now() - startTime}ms`,
        });
        throw error;
      }
    },
    onMutate: async () => {
      const startTime = Date.now();
      console.log("[Client] Starting optimistic update");
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.data.root(tableId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });

      const previousTableData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.data.root(tableId),
      );
      const previousTables = queryClient.getQueryData<{
        success: boolean;
        tables: SerializedTable[];
      }>(queryKeys.bases.tables.list(baseId));

      if (previousTables?.tables) {
        queryClient.setQueryData(queryKeys.bases.tables.list(baseId), {
          ...previousTables,
          tables: previousTables.tables.filter((table) => table.id !== tableId),
        });
      }

      console.log("[Client] Optimistic update completed", {
        timestamp: new Date().toISOString(),
        timeSinceStart: `${Date.now() - startTime}ms`,
      });

      return { previousTableData, previousTables };
    },
    onError: (error, _, context) => {
      console.error("[Client] Delete mutation error in onError:", {
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      if (context?.previousTableData) {
        queryClient.setQueryData(
          queryKeys.tables.data.root(tableId),
          context.previousTableData,
        );
      }
      if (context?.previousTables) {
        queryClient.setQueryData(
          queryKeys.bases.tables.list(baseId),
          context.previousTables,
        );
      }
    },
    onSettled: () => {
      console.log("[Client] Delete mutation settled", {
        timestamp: new Date().toISOString(),
      });
    },
  });

  const wrappedRenameTable = async (
    newName: string,
  ): Promise<TableRenameResponse> => {
    const result = await renameMutation.mutateAsync(newName);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to rename table");
    }
    return result;
  };

  return {
    tableData,
    isLoading: status === "pending",
    tableError: queryError,
    addRow: () => {
      const columns = pages?.pages?.[0]?.success
        ? pages.pages[0].table.columns
        : [];
      const optimisticRow = generateMockRow(columns);
      return addRowMutation.mutateAsync(optimisticRow);
    },
    addBulkRows: (count: number) => {
      const columns = pages?.pages?.[0]?.success
        ? pages.pages[0].table.columns
        : [];
      const optimisticRows = Array.from({ length: count }, () =>
        generateMockRow(columns),
      );
      return addBulkRowsMutation.mutateAsync({ optimisticRows });
    },
    updateCell: updateCellMutation.mutateAsync,
    isAddingRow: addRowMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
    isBatchAdding: addBulkRowsMutation.isPending,
    renameTable: wrappedRenameTable,
    isRenaming: renameMutation.isPending,
    deleteTable: () => deleteTableMutation.mutateAsync(),
    isDeleting: deleteTableMutation.isPending,
    isDeletingColumn: false,
    isAddingColumn: false,
    isRenamingColumn: false,
    fetchNextPageUnsorted: fetchNextPage,
    hasNextPageUnsorted: hasNextPage,
    isFetchingNextPageUnsorted: isFetchingNextPage,
  };
};
