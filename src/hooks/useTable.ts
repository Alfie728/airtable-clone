"use client";

import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { type tables } from "~/server/db/schema";
import {
  getTables,
  getTableData,
  addRow,
  addCell,
  addBulkRows,
} from "~/lib/actions/tables.action";
import { faker } from "@faker-js/faker";
import { useRef } from "react";
import {
  useQueryClient as useQueryClientTanstack,
  type QueryClient,
} from "@tanstack/react-query";

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

  const baseQuery = useQuery<BaseResponse>({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    enabled: Boolean(baseId),
    staleTime: 10 * 1000,
  });

  const tableName =
    baseQuery.data?.tables?.find((t) => t.id === tableId)?.name ?? "";

  const tableQuery = useQuery<TableResponse>({
    queryKey: ["table", tableId],
    queryFn: () => getTableData(tableId, tableName),
    enabled: Boolean(tableId && tableName),
    staleTime: 5 * 1000,
  });

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
      console.log("[useTable] Starting cell update:", {
        rowId: params.rowId,
        columnId: params.columnId,
        value: params.value,
        pendingCreations: Array.from(pendingRowCreationsRef.current.keys()),
      });

      // 1. Check if this is a new row being created
      const pendingCreation = pendingRowCreationsRef.current.get(params.rowId);
      if (pendingCreation) {
        console.log("[useTable] Found pending creation for row:", params.rowId);
        try {
          // Wait for row creation to complete
          await pendingCreation;
          console.log("[useTable] Row creation completed, updating cell");
          // Use the same ID since it's preserved on the server
          return addCell(params.rowId, params.columnId, params.value);
        } catch (error) {
          console.error("[useTable] Row creation error:", error);
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      // 2. Update the cell directly since IDs are the same
      latestMutationRef.current = "updateCell";
      const result = await addCell(params.rowId, params.columnId, params.value);

      if (!result.success) {
        console.error("[useTable] Cell update failed:", {
          error: result.error,
          rowId: params.rowId,
          columnId: params.columnId,
          value: params.value,
        });
        throw new Error(result.error ?? "Cell update failed");
      }

      return result;
    },
    onMutate: async (params) => {
      // Only cancel queries if this is not a pending row update
      if (!pendingRowCreationsRef.current.has(params.rowId)) {
        await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      }
      return { params };
    },
    onSettled: () => {
      if (latestMutationRef.current === "updateCell") {
        void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
      }
    },
  });

  const addBulkRowsMutation = useMutation({
    mutationFn: (count: number) => {
      latestMutationRef.current = "addBulkRows";
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);
      if (!previousData?.table) throw new Error("No table data");

      const optimisticRows = Array(count)
        .fill(null)
        .map(() => generateMockRow(previousData.table!.columns));

      return addBulkRows(tableId, optimisticRows);
    },
    onMutate: async (count) => {
      await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);

      if (previousData?.table) {
        const optimisticRows = Array(count)
          .fill(null)
          .map(() => generateMockRow(previousData.table!.columns));

        queryClient.setQueryData<TableResponse>(["table", tableId], {
          ...previousData,
          table: {
            ...previousData.table,
            data: [...previousData.table.data, ...optimisticRows],
          },
        });
      }

      return { previousData };
    },
    onError: (err, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["table", tableId], context.previousData);
      }
    },
    onSettled: () => {
      if (latestMutationRef.current === "addBulkRows") {
        void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
      }
    },
  });

  return {
    baseTables: baseQuery.data?.tables,
    isBaseLoading: baseQuery.isLoading,
    baseError: baseQuery.error,
    tableData: tableQuery.data?.table,
    isLoading: tableQuery.isLoading,
    error: tableQuery.error,
    addRow: () => {
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);
      if (previousData?.table) {
        const optimisticRow = generateMockRow(previousData.table.columns);
        addRowMutation.mutate(optimisticRow);
      }
    },
    addBulkRows: (count: number) => {
      void addBulkRowsMutation.mutate(count);
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
  };
};

// Export the types
export type { Row, Column, TableData, TableResponse, BaseResponse };
