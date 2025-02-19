"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  addColumn,
  deleteColumn,
  renameColumn,
  updateColumnsOrder,
} from "~/lib/actions/columns.action";
import { updateRowsOrder } from "~/lib/actions/rows.action";
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
    data: Row[];
  };
}

interface AddColumnParams {
  name: string;
  type: "text" | "number";
  defaultValue?: string;
}

export const useColumns = (tableId: string) => {
  const queryClient = useQueryClient();

  const addColumnMutation = useMutation({
    mutationFn: async ({ name, type, defaultValue }: AddColumnParams) => {
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

      // Update client state immediately with default values
      if (
        !previousData?.table?.data ||
        !Array.isArray(previousData.table.data)
      ) {
        console.error("Invalid table data structure");
        return;
      }

      queryClient.setQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
        {
          ...previousData,
          table: {
            ...previousData.table,
            columns: [...previousData.table.columns, optimisticColumn],
            data: previousData.table.data.map((row) => ({
              ...row,
              [optimisticColumn.id]:
                type === "number" ? 0 : (defaultValue ?? ""),
            })),
          },
        },
      );

      // Sync with server
      const result = await addColumn(tableId, uniqueName, type);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to add column");
      }

      return result;
    },
    onSuccess: (data, variables, context) => {
      // The mutation function already updates the cache optimistically
      // and handles the server response, so we don't need additional logic here
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

          // Update data by removing the deleted column's data
          const updatedData = (previousData.table.data ?? []).map(
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
                data: updatedData,
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

  const reorderRowsMutation = useMutation<
    { success: boolean; rows?: Row[] },
    Error,
    { rowOrders: { id: string; order: number }[] },
    ReorderColumnsContext
  >({
    mutationFn: async ({ rowOrders }) => {
      console.log("mutationFn - rowOrders:", rowOrders);
      const result = await updateRowsOrder(tableId, rowOrders);
      console.log("mutationFn - server result:", result);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to reorder rows");
      }
      return {
        success: true,
        rows: result.rows,
      };
    },
    onMutate: async ({ rowOrders }) => {
      console.log("onMutate - rowOrders:", rowOrders);

      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      console.log("onMutate - previousData:", {
        hasTable: !!previousData?.table,
        tableId: previousData?.table?.id,
        rowsType: typeof previousData?.table?.data,
        isArray: Array.isArray(previousData?.table?.data),
        rowsLength: previousData?.table?.data?.length,
        rows: previousData?.table?.data,
      });

      if (!previousData?.table?.data) {
        console.log("onMutate - no data found, returning empty state");
        return { previousData };
      }

      if (!Array.isArray(previousData.table.data)) {
        console.log("onMutate - data is not an array, returning empty state");
        return { previousData };
      }

      try {
        const orderMap = new Map(rowOrders.map((row) => [row.id, row.order]));
        console.log(
          "onMutate - orderMap created:",
          Object.fromEntries(orderMap),
        );

        const updatedData = [...previousData.table.data].map((row) => {
          const newOrder = orderMap.get(row.id) ?? row.order;
          console.log("onMutate - updating row:", {
            id: row.id,
            oldOrder: row.order,
            newOrder,
          });
          return {
            ...row,
            order: newOrder,
          };
        });

        console.log("onMutate - updatedData:", updatedData);

        // Update the cache with sorted data
        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              data: updatedData,
            },
          },
        );

        return { previousData };
      } catch (error) {
        console.error("onMutate - error during row update:", error);
        return { previousData };
      }
    },
    onError: (err, variables, context) => {
      console.log("onError:", {
        error: err.message,
        variables,
        hasPreviousData: !!context?.previousData,
      });

      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder rows",
        );
      }
    },
    onSuccess: (data) => {
      console.log("onSuccess - result:", data);
    },
  });

  return {
    addColumn: (params: {
      name: string;
      type: "text" | "number";
      defaultValue: string;
    }) => addColumnMutation.mutateAsync(params),
    deleteColumn: (columnId: string) =>
      deleteColumnMutation.mutateAsync(columnId),
    renameColumn: (params: { columnId: string; newName: string }) =>
      renameColumnMutation.mutateAsync(params),
    reorderColumns: (params: {
      columnOrders: { id: string; order: number }[];
    }) => reorderColumnsMutation.mutateAsync(params),
    reorderRows: (params: { rowOrders: { id: string; order: number }[] }) =>
      reorderRowsMutation.mutateAsync(params),
    isAddingColumn: addColumnMutation.isPending,
    isDeletingColumn: deleteColumnMutation.isPending,
    isRenamingColumn: renameColumnMutation.isPending,
    isReorderingColumns: reorderColumnsMutation.isPending,
  };
};
