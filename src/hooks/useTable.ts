"use client";

import {
  useQueryClient,
  useQuery,
  useMutation,
  useQueries,
} from "@tanstack/react-query";
import { type tables } from "~/server/db/schema";
import {
  getTables,
  getTableData,
  addRow,
  addCell,
  addBulkRows,
} from "~/lib/actions/tables.action";
import { faker } from "@faker-js/faker";
import { useRef, useEffect } from "react";

// Define types at the top
interface Row {
  id: string;
  [key: string]: string | number;
}

interface Column {
  id: string;
  name: string;
  type: "text" | "number";
  order: number;
  width: number;
  isSearchable: boolean;
  isSortable: boolean;
  isVisible: boolean;
}

interface TableData {
  id: string;
  name: string;
  columns: Column[];
  data: Row[];
}

interface TableResponse {
  success: boolean;
  table?: TableData;
  error?: string;
}

interface BaseResponse {
  success: boolean;
  tables?: (typeof tables.$inferSelect)[];
  error?: string;
}

function generateMockRow(columns: Column[]): Row {
  const row: Row = { id: crypto.randomUUID() };

  columns.forEach((column) => {
    if (column.type === "text") {
      row[column.name] = generateTextValue(column.name.toLowerCase());
    } else if (column.type === "number") {
      row[column.name] = generateNumberValue(column.name.toLowerCase());
    }
  });

  return row;
}

// Helper functions to make the code more maintainable
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

export const useTable = (baseId: string, tableId: string) => {
  const queryClient = useQueryClient();
  const latestMutationRef = useRef<string | null>(null);
  const pendingRowCreationsRef = useRef<Map<string, Promise<unknown>>>(
    new Map(),
  );
  const rowIdMappingRef = useRef<Map<string, string>>(new Map());

  // Query for base tables
  const baseQuery = useQuery({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    staleTime: 10 * 1000,
  });

  // Get all table queries in parallel using useQueries
  const tableQueries = useQueries({
    queries: (baseQuery.data?.tables ?? []).map((table) => ({
      queryKey: ["table", table.id] as const,
      queryFn: () => getTableData(table.id, table.name),
      staleTime: 5 * 1000,
      placeholderData: () =>
        queryClient.getQueryData<TableResponse>(["table", table.id]),
      // Cancel in-flight queries when switching tables
      gcTime: 0,
      enabled: table.id === tableId,
    })),
  });

  // Cancel previous table queries when switching tables
  useEffect(() => {
    return () => {
      // Cancel any in-flight queries for the previous table
      void queryClient.cancelQueries({ queryKey: ["table", tableId] });
    };
  }, [queryClient, tableId]);

  // Find the current table's query result
  const currentTableQuery = tableQueries.find(
    (q) => q.data?.table?.id === tableId,
  );

  const addRowMutation = useMutation({
    mutationFn: async (optimisticRow: Row) => {
      console.log("[useTable] Starting row creation for:", optimisticRow.id);
      latestMutationRef.current = "addRow";
      const promise = addRow(tableId, optimisticRow);
      pendingRowCreationsRef.current.set(optimisticRow.id, promise);
      const result = await promise;
      if (result.success && result.row && "id" in result.row) {
        console.log("[useTable] Row creation completed. Mapping IDs:", {
          clientId: optimisticRow.id,
          serverId: result.row.id,
        });
        rowIdMappingRef.current.set(optimisticRow.id, result.row.id);
      }
      return result;
    },
    onMutate: async (optimisticRow) => {
      await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);

      if (previousData?.table) {
        queryClient.setQueryData<TableResponse>(["table", tableId], {
          ...previousData,
          table: {
            ...previousData.table,
            data: [...previousData.table.data, optimisticRow],
          },
        });
      }

      return { previousData, optimisticRow };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["table", tableId], context.previousData);
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
        void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
      }
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: async (params: {
      rowId: string;
      columnId: string;
      value: string;
    }) => {
      // console.log("[useTable] Starting cell update:", {
      //   rowId: params.rowId,
      //   columnId: params.columnId,
      //   value: params.value,
      //   pendingCreations: Array.from(pendingRowCreationsRef.current.keys()),
      //   latestMutation: latestMutationRef.current,
      //   hasPendingBulkOps: addBulkRowsMutation.isPending,
      // });

      const MAX_RETRIES = 5;
      const INITIAL_DELAY = 1000;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          // 1. Check if this is a new row being created
          const pendingCreation = pendingRowCreationsRef.current.get(
            params.rowId,
          );
          if (pendingCreation) {
            // console.log(
            //   "[useTable] Found pending creation for row:",
            //   params.rowId,
            //   "waiting for completion...",
            // );
            try {
              // Wait for row creation to complete
              await pendingCreation;
              // console.log(
              //   "[useTable] Row creation completed for:",
              //   params.rowId,
              // );
              return addCell(params.rowId, params.columnId, params.value);
            } catch (error) {
              // console.error("[useTable] Row creation error:", {
              //   rowId: params.rowId,
              //   error,
              // });
              throw error instanceof Error ? error : new Error(String(error));
            }
          }

          // 2. Update the cell directly since IDs are the same
          latestMutationRef.current = "updateCell";
          // console.log("[useTable] Updating cell directly:", {
          //   rowId: params.rowId,
          //   columnId: params.columnId,
          //   value: params.value,
          // });

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
                // console.log(
                //   `[useTable] Row not found, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`,
                //   { rowId: params.rowId },
                // );
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
            }
            // console.error("[useTable] Cell update failed:", {
            //   error: result.error,
            //   rowId: params.rowId,
            //   columnId: params.columnId,
            //   value: params.value,
            // });
            throw new Error(result.error ?? "Cell update failed");
          }

          // console.log("[useTable] Cell update successful:", {
          //   rowId: params.rowId,
          //   columnId: params.columnId,
          // });
          return result;
        } catch (error) {
          if (retryCount === MAX_RETRIES - 1) {
            throw error;
          }
          retryCount++;
          const delay = INITIAL_DELAY * Math.pow(2, retryCount - 1);
          // console.log(
          //   `[useTable] Error updating cell, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`,
          //   { error, rowId: params.rowId },
          // );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new Error("Max retries exceeded");
    },
    onMutate: async (params) => {
      // console.log("[useTable] Starting optimistic cell update:", {
      //   rowId: params.rowId,
      //   columnId: params.columnId,
      //   value: params.value,
      //   hasPendingCreation: pendingRowCreationsRef.current.has(params.rowId),
      // });

      // Only cancel queries if this is not a pending row update
      if (!pendingRowCreationsRef.current.has(params.rowId)) {
        await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      }

      // Apply optimistic update
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);

      const table = previousData?.table;
      if (table?.columns && table.data) {
        // console.log("[useTable] Applying optimistic update for cell:", {
        //   rowId: params.rowId,
        //   columnId: params.columnId,
        //   currentDataSize: table.data.length,
        // });

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
        queryClient.setQueryData(["table", tableId], updatedData);
      }

      return { previousData, params };
    },
    onError: (err, variables, context) => {
      // console.error("[useTable] Cell update error:", {
      //   error: err,
      //   rowId: variables.rowId,
      //   columnId: variables.columnId,
      // });
      if (context?.previousData) {
        queryClient.setQueryData(["table", tableId], context.previousData);
      }
    },
    onSettled: (data, error, variables) => {
      // console.log("[useTable] Cell update settled:", {
      //   success: !error,
      //   rowId: variables.rowId,
      //   columnId: variables.columnId,
      //   hasPendingBulkOps: addBulkRowsMutation.isPending,
      //   latestMutation: latestMutationRef.current,
      // });

      // Only invalidate if there are no pending bulk operations
      if (
        latestMutationRef.current === "updateCell" &&
        !addBulkRowsMutation.isPending
      ) {
        // console.log("[useTable] Invalidating queries after cell update");
        void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
      }
    },
  });

  const addBulkRowsMutation = useMutation({
    mutationFn: async (params: { optimisticRows: Row[] }) => {
      // console.log("[useTable] Starting bulk row creation:", {
      //   rowCount: params.optimisticRows.length,
      //   firstRowId: params.optimisticRows[0]?.id,
      //   lastRowId: params.optimisticRows[params.optimisticRows.length - 1]?.id,
      // });

      latestMutationRef.current = "addBulkRows";
      // Add all rows to pending creations map
      const promise = addBulkRows(tableId, params.optimisticRows);
      params.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.set(row.id, promise);
      });

      // console.log("[useTable] Added rows to pending creations:", {
      //   pendingCount: pendingRowCreationsRef.current.size,
      // });

      const result = await promise;

      // Clear pending creations after success
      params.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.delete(row.id);
      });

      // console.log("[useTable] Bulk row creation completed:", {
      //   success: result.success,
      //   remainingPending: pendingRowCreationsRef.current.size,
      // });

      return result;
    },
    onMutate: async (params: { optimisticRows: Row[] }) => {
      // console.log("[useTable] Starting optimistic bulk update:", {
      //   rowCount: params.optimisticRows.length,
      // });

      await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);

      if (previousData?.table) {
        // console.log("[useTable] Applying optimistic bulk update:", {
        //   currentDataSize: previousData.table.data.length,
        //   addingRows: params.optimisticRows.length,
        // });

        queryClient.setQueryData<TableResponse>(["table", tableId], {
          ...previousData,
          table: {
            ...previousData.table,
            data: [...previousData.table.data, ...params.optimisticRows],
          },
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // console.error("[useTable] Bulk row creation error:", {
      //   error: err,
      //   rowCount: variables.optimisticRows.length,
      // });
      if (context?.previousData) {
        queryClient.setQueryData(["table", tableId], context.previousData);
      }
    },
    onSettled: (data, error) => {
      // console.log("[useTable] Bulk row creation settled:", {
      //   success: !error,
      //   hasPendingCellUpdates: updateCellMutation.isPending,
      //   latestMutation: latestMutationRef.current,
      // });

      // Only invalidate if there are no pending cell updates
      if (
        latestMutationRef.current === "addBulkRows" &&
        !updateCellMutation.isPending
      ) {
        // console.log("[useTable] Invalidating queries after bulk creation");
        void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
      }
    },
  });

  return {
    addRow: () => {
      const tableData = currentTableQuery?.data;
      if (tableData?.success && tableData.table) {
        const optimisticRow = generateMockRow(tableData.table.columns);
        addRowMutation.mutate(optimisticRow);
      }
    },
    addBulkRows: (count: number) => {
      const tableData = currentTableQuery?.data;
      if (tableData?.success && tableData.table) {
        const optimisticRows = Array(count)
          .fill(null)
          .map(() => generateMockRow(tableData.table!.columns));
        void addBulkRowsMutation.mutate({ optimisticRows });
      }
    },
    updateCell: (params: {
      rowId: string;
      columnId: string;
      value: string;
    }) => {
      return updateCellMutation.mutateAsync(params);
    },
    isAddingRow: addRowMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
    isBatchAdding: addBulkRowsMutation.isPending,
    // Add loading states
    isLoading: baseQuery.isLoading ?? false,
    isTableLoading: currentTableQuery?.isLoading ?? false,
    // Add error states
    baseError: baseQuery.error ?? null,
    tableError: currentTableQuery?.error ?? null,
    // Add table data
    tableData: currentTableQuery?.data?.table,
    // Add base tables data
    baseTables: baseQuery.data?.tables ?? [],
  };
};

// Export the types
export type { Row, Column, TableData, TableResponse, BaseResponse };
