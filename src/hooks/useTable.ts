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
    mutationFn: (optimisticRow: Row) => addRow(tableId, optimisticRow),
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
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
    },
  });

  const updateCellMutation = useMutation({
    mutationFn: async (params: {
      rowId: string;
      columnId: string;
      value: string;
    }) => {
      const result = await addCell(params.rowId, params.columnId, params.value);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onMutate: async ({ rowId, columnId, value }) => {
      await queryClient.cancelQueries({ queryKey: ["table", tableId] });
      const previousData = queryClient.getQueryData<TableResponse>([
        "table",
        tableId,
      ]);

      if (previousData?.table) {
        const updatedData = previousData.table.data.map((row) => {
          if (row.id === rowId) {
            const column = previousData.table?.columns.find(
              (col) => col.id === columnId,
            );
            if (column) {
              return {
                ...row,
                [column.name]:
                  column.type === "number" ? Number(value) || 0 : value,
              };
            }
          }
          return row;
        });

        queryClient.setQueryData<TableResponse>(["table", tableId], {
          ...previousData,
          table: {
            ...previousData.table,
            data: updatedData,
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
      void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
    },
  });

  const addBulkRowsMutation = useMutation({
    mutationFn: (count: number) => {
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
      void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
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
