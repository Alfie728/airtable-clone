"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  addColumn,
  deleteColumn,
  renameColumn,
  updateColumnsOrder,
} from "~/lib/actions/columns.action";
import type { Column, Row } from "~/types/table";
import { queryKeys } from "~/lib/query/keys";
import { toast } from "sonner";

interface AddColumnContext {
  previousData?: TableResponse;
}

interface DeleteColumnContext {
  previousData?: TableResponse;
}

interface RenameColumnContext {
  previousData?: TableResponse;
}

interface ReorderColumnsContext {
  previousData?: TableResponse;
}

interface TableResponse {
  success: boolean;
  error?: string;
  table?: {
    id: string;
    name: string;
    baseId: string;
    columns: Column[];
    rows: Row[];
  };
}

export const useColumns = (tableId: string) => {
  const queryClient = useQueryClient();

  const addColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    { name: string; type: "text" | "number" },
    AddColumnContext
  >({
    mutationFn: async ({ name, type }) => {
      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (!previousData?.table) {
        throw new Error("No table data found");
      }

      // Generate unique name based on client state
      const existingColumns = previousData.table.columns;
      let uniqueName = name;
      let counter = 1;
      while (existingColumns.some((col) => col.name === uniqueName)) {
        uniqueName = `${name} ${counter}`;
        counter++;
      }

      // Create optimistic column
      const optimisticColumn: Column = {
        id: crypto.randomUUID(),
        name: uniqueName,
        type,
        order: previousData.table.columns.length,
        width: 200,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      };

      // Update client state immediately
      queryClient.setQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
        {
          ...previousData,
          table: {
            ...previousData.table,
            columns: [...previousData.table.columns, optimisticColumn],
          },
        },
      );

      // Sync with server
      const result = await addColumn(tableId, uniqueName, type);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to add column");
      }

      // Update the client state with the server's column ID
      const updatedData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (updatedData?.table) {
        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...updatedData,
            table: {
              ...updatedData.table,
              columns: updatedData.table.columns.map((col) =>
                col.id === optimisticColumn.id ? result.column! : col,
              ),
            },
          },
        );
      }

      return result;
    },
    onError: (error, newColumn, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
        toast.error(
          error instanceof Error ? error.message : "Failed to add column",
        );
      }
    },
  });

  const deleteColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    string,
    DeleteColumnContext
  >({
    mutationFn: async (columnId: string) => {
      const result = await deleteColumn(tableId, columnId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete column");
      }
      return result;
    },
    onMutate: async (columnId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.tables.detail(tableId)],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table?.columns) {
        // Get the column being deleted
        const deletedColumn = previousData.table.columns.find(
          (col) => col.id === columnId,
        );

        if (deletedColumn) {
          // Update columns with new order
          const updatedColumns = previousData.table.columns
            .filter((col) => col.id !== columnId)
            .map((col) =>
              col.order > deletedColumn.order
                ? { ...col, order: col.order - 1 }
                : col,
            );

          // Update rows by removing the deleted column's data
          const updatedRows = (previousData.table.rows ?? []).map(
            (row: Row) => {
              const newRow = { ...row };
              delete newRow[deletedColumn.name];
              return newRow;
            },
          );

          // Update the cache
          queryClient.setQueryData<TableResponse>(
            queryKeys.tables.detail(tableId),
            {
              ...previousData,
              table: {
                ...previousData.table,
                columns: updatedColumns,
                rows: updatedRows,
              },
            },
          );
        }
      }

      return { previousData };
    },
    onError: (err, columnId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Only invalidate the specific table's data
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });
    },
  });

  const renameColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    { columnId: string; newName: string },
    RenameColumnContext
  >({
    mutationFn: async ({ columnId, newName }) => {
      const result = await renameColumn(tableId, columnId, newName);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to rename column");
      }
      return result;
    },
    onMutate: async ({ columnId, newName }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table) {
        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              columns: previousData.table.columns.map((col) =>
                col.id === columnId ? { ...col, name: newName } : col,
              ),
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });
    },
  });

  const reorderColumnsMutation = useMutation<
    { success: boolean; columns?: Column[] },
    Error,
    { columnOrders: { id: string; order: number }[] },
    ReorderColumnsContext
  >({
    mutationFn: async ({ columnOrders }) => {
      const result = await updateColumnsOrder(tableId, columnOrders);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to reorder columns");
      }
      return result;
    },
    onMutate: async ({ columnOrders }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table) {
        const orderMap = new Map(
          columnOrders.map((col) => [col.id, col.order]),
        );

        const updatedColumns = [...previousData.table.columns].map((col) => ({
          ...col,
          order: orderMap.get(col.id) ?? col.order,
        }));

        // Update the cache with sorted columns
        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              columns: updatedColumns,
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
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder columns",
        );
      }
    },
  });

  return {
    addColumn: (params: { name: string; type: "text" | "number" }) =>
      addColumnMutation.mutateAsync(params),
    deleteColumn: (columnId: string) =>
      deleteColumnMutation.mutateAsync(columnId),
    renameColumn: (params: { columnId: string; newName: string }) =>
      renameColumnMutation.mutateAsync(params),
    reorderColumns: (params: {
      columnOrders: { id: string; order: number }[];
    }) => reorderColumnsMutation.mutateAsync(params),
    isAddingColumn: addColumnMutation.isPending,
    isDeletingColumn: deleteColumnMutation.isPending,
    isRenamingColumn: renameColumnMutation.isPending,
    isReorderingColumns: reorderColumnsMutation.isPending,
  };
};
