"use client";

import {
  useQueryClient,
  useQuery,
  useMutation,
  useQueries,
} from "@tanstack/react-query";
import { faker } from "@faker-js/faker";
import { useRef, useEffect } from "react";
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
  TableDeleteResponse,
} from "~/types/table";
import { useBase } from "./useBase";
import { queryKeys } from "~/lib/query/keys";
import type { tables } from "~/server/db/schema";
import { type SortingState } from "@tanstack/react-table";
import { queryClient } from "~/lib/query";

// Add proper type for the server action response
type DeleteTableResponse = { success: boolean; error?: string };

function generateMockRow(columns: Column[]): Row {
  const row: Row = {
    id: crypto.randomUUID(),
    order: 0, // Will be updated with correct order when adding to table data
  };

  columns.forEach((column) => {
    if (column.type === "text") {
      row[column.name] = generateTextValue(column.name.toLowerCase());
    } else if (column.type === "number") {
      row[column.name] = generateNumberValue(column.name.toLowerCase());
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
      return faker.phone.number();
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

function isTableRenameResponse(value: unknown): value is TableRenameResponse {
  if (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    typeof (value as { success: unknown }).success === "boolean"
  ) {
    const response = value as {
      success: boolean;
      error?: unknown;
      table?: unknown;
    };
    if (!response.success) {
      return (
        typeof response.error === "undefined" ||
        typeof response.error === "string"
      );
    }
    if (response.table) {
      const table = response.table as Record<string, unknown>;
      return (
        typeof table.id === "string" &&
        typeof table.name === "string" &&
        typeof table.baseId === "string" &&
        (table.description === null || typeof table.description === "string") &&
        typeof table.rowCount === "number" &&
        table.createdAt instanceof Date &&
        (table.updatedAt === null || table.updatedAt instanceof Date)
      );
    }
    return true;
  }
  return false;
}

export const useTable = (baseId: string, tableId: string, viewId?: string) => {
  const queryClient = useQueryClient();
  const latestMutationRef = useRef<string | null>(null);
  const pendingRowCreationsRef = useRef<Map<string, Promise<unknown>>>(
    new Map(),
  );
  const rowIdMappingRef = useRef<Map<string, string>>(new Map());

  const { tables } = useBase(baseId);

  // Get all table queries in parallel using useQueries
  const tableQueries = useQueries({
    queries: tables.map((table) => ({
      queryKey: queryKeys.tables.detail(table.id),
      queryFn: () => getTableData(table.id, table.name),
      staleTime: 5 * 1000,
      enabled: table.id === tableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      placeholderData: () =>
        queryClient.getQueryData<TableResponse>(
          queryKeys.tables.detail(table.id),
        ),
      gcTime: 300000,
    })),
  });

  // Cancel previous table queries when switching tables
  useEffect(() => {
    return () => {
      void queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });
    };
  }, [queryClient, tableId]);

  // Find the current table query based on the index in the base tables array
  const currentTableIndex = tables.findIndex((t) => t.id === tableId) ?? -1;
  const currentTableQuery =
    currentTableIndex >= 0 ? tableQueries[currentTableIndex] : undefined;

  // Check loading state for the current table
  const isTableLoading = currentTableQuery?.status === "pending";

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
        queryKey: queryKeys.tables.detail(tableId),
      });
      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table) {
        // Get the highest order using reduce - more efficient for large datasets
        const maxOrder = previousData.table.data.reduce(
          (max, row) => (row.order > max ? row.order : max),
          -1,
        );

        // Set the optimistic row's order to be after all existing rows
        const rowWithOrder = {
          ...optimisticRow,
          order: maxOrder + 1,
        };

        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              data: [...previousData.table.data, rowWithOrder],
            },
          },
        );
      }

      return { previousData, optimisticRow };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
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
      if (
        latestMutationRef.current === "addRow" &&
        pendingRowCreationsRef.current.size === 0
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tables.detail(tableId),
        });
      }
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
          queryKey: queryKeys.tables.detail(tableId),
        });
      }

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      const table = previousData?.table;
      if (table?.columns && table.data) {
        const updatedData = {
          ...previousData,
          table: {
            ...table,
            data: table.data.map((row) => {
              if (row.id === params.rowId) {
                const columnName = table.columns.find(
                  (col) => col.id === params.columnId,
                )?.name;
                if (columnName) {
                  return {
                    ...row,
                    [columnName]: params.value,
                  };
                }
              }
              return row;
            }),
          },
        };
        queryClient.setQueryData(queryKeys.tables.detail(tableId), updatedData);
      }

      return { previousData, params };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      if (
        latestMutationRef.current === "updateCell" &&
        !addBulkRowsMutation.isPending
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tables.detail(tableId),
        });
      }
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
        queryKey: queryKeys.tables.detail(tableId),
      });
      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table) {
        // Get the highest order using reduce - more efficient for large datasets
        const maxOrder = previousData.table.data.reduce(
          (max, row) => (row.order > max ? row.order : max),
          -1,
        );

        // Set the optimistic rows' orders to be sequential after all existing rows
        const rowsWithOrder = params.optimisticRows.map((row, index) => ({
          ...row,
          order: maxOrder + 1 + index,
        }));

        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              data: [...previousData.table.data, ...rowsWithOrder],
            },
          },
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      if (
        latestMutationRef.current === "addBulkRows" &&
        !updateCellMutation.isPending
      ) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tables.detail(tableId),
        });
      }
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
        queryKey: queryKeys.tables.detail(tableId),
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
        queryKeys.tables.detail(tableId),
      );

      if (previousTableData?.table) {
        queryClient.setQueryData(queryKeys.tables.detail(tableId), {
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
          queryKeys.tables.detail(tableId),
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
        queryKey: queryKeys.tables.detail(tableId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });

      const previousTableData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
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
          queryKeys.tables.detail(tableId),
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

  // Get current sorting state using useQuery instead of getQueryData
  const { data: sortState } = useQuery<SortingState>({
    queryKey: queryKeys.views.sorts(viewId ?? ""),
    enabled: !!viewId,
    staleTime: 0,
  });

  const {
    data: tableData,
    isLoading,
    error: tableError,
  } = useQuery({
    queryKey: [
      ...queryKeys.tables.detail(tableId),
      viewId ?? "default",
      "sorting",
      sortState,
    ],
    queryFn: async () => {
      // Get table name from the tables list
      const tableName = tables.find((t) => t.id === tableId)?.name ?? "";

      const result = await getTableData(tableId, tableName, sortState);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to get table data");
      }
      return result.table;
    },
    staleTime: 0,
  });

  return {
    tableData: tableData,
    isLoading: isTableLoading,
    tableError: tableError,
    addRow: () => {
      const optimisticRow = generateMockRow(tableData?.columns ?? []);
      return addRowMutation.mutateAsync(optimisticRow);
    },
    addBulkRows: (count: number) => {
      const optimisticRows = Array.from({ length: count }, () =>
        generateMockRow(tableData?.columns ?? []),
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
  };
};
