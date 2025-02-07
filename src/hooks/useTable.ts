import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { type tables } from "~/server/db/schema";
import {
  getTables,
  getTableData,
  createTable,
  addRow,
  addCell,
} from "~/lib/actions/tables.action";
import { QueryClient } from "@tanstack/react-query";
import { faker } from "@faker-js/faker";

// Types for table state management
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

// Prefetch function for SSR
export async function prefetchTable(baseId: string, tableId: string) {
  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["base", baseId],
      queryFn: () => getTables(baseId),
    }),
    queryClient.prefetchQuery({
      queryKey: ["table", tableId],
      queryFn: () => getTableData(tableId, ""),
    }),
  ]);

  return queryClient;
}

function generateMockRow(columns: Column[]): Row {
  const row: Row = { id: crypto.randomUUID() };
  columns.forEach((column) => {
    if (column.type === "text") {
      switch (column.name.toLowerCase()) {
        case "name":
          row[column.name] = faker.person.fullName();
          break;
        case "notes":
          row[column.name] = faker.lorem.sentence();
          break;
        case "email":
          row[column.name] = faker.internet.email();
          break;
        case "phone":
          row[column.name] = faker.phone.number();
          break;
        case "company":
          row[column.name] = faker.company.name();
          break;
        case "city":
          row[column.name] = faker.location.city();
          break;
        default:
          row[column.name] = faker.lorem.word();
      }
    } else if (column.type === "number") {
      switch (column.name.toLowerCase()) {
        case "age":
          row[column.name] = faker.number.int({ min: 18, max: 80 });
          break;
        case "price":
          row[column.name] = faker.number.float({
            min: 1,
            max: 1000,
            fractionDigits: 2,
          });
          break;
        default:
          row[column.name] = faker.number.int({ min: 0, max: 100 });
      }
    }
  });
  return row;
}

// Main hook for table operations
export const useTable = (baseId: string, tableId: string) => {
  const queryClient = useQueryClient();

  // Query for fetching base data (tables list)
  const baseQuery = useQuery<BaseResponse>({
    queryKey: ["base", baseId],
    queryFn: () => getTables(baseId),
    enabled: !!baseId,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
  });

  // Get table name from base data
  const tableName =
    baseQuery.data?.tables?.find((t) => t.id === tableId)?.name ?? "";

  // Query for fetching table data
  const tableQuery = useQuery<TableResponse>({
    queryKey: ["table", tableId],
    queryFn: () => getTableData(tableId, tableName),
    enabled: !!tableId && !!tableName,
    staleTime: 5 * 1000, // Consider data fresh for 5 seconds
  });

  // Mutation for adding a row
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

        return { previousData, optimisticRow };
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<TableResponse>(
          ["table", tableId],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
    },
  });

  // Mutation for updating a cell
  const updateCellMutation = useMutation({
    mutationFn: ({
      rowId,
      columnId,
      value,
    }: {
      rowId: string;
      columnId: string;
      value: string;
    }) => {
      return addCell(rowId, columnId, value);
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
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData<TableResponse>(
          ["table", tableId],
          context.previousData,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["table", tableId] });
    },
  });

  return {
    // Base data
    baseTables: baseQuery.data?.tables,
    isBaseLoading: baseQuery.isLoading,
    baseError: baseQuery.error,

    // Table data
    tableData: tableQuery.data?.table,
    isLoading: tableQuery.isLoading,
    error: tableQuery.error,

    // Mutations
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
    updateCell: (params: { rowId: string; columnId: string; value: string }) =>
      updateCellMutation.mutate(params),
    isAddingRow: addRowMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
  };
};

// Helper function to generate an empty row
function generateEmptyRow(columns: Column[]): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  columns.forEach((column) => {
    row[column.name] = column.type === "number" ? 0 : "";
  });
  return row;
}
