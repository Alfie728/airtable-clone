"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  deleteRow,
  bulkDeleteRows,
  updateRowsOrder,
} from "~/lib/actions/rows.action";
import type { RowResponse, RowsResponse } from "~/lib/actions/rows.action";
import type { Row } from "~/types/table";
import { queryKeys } from "~/lib/query/keys";
import { toast } from "sonner";

interface DeleteRowContext {
  previousData?: TableResponse;
}

interface BulkDeleteRowsContext {
  previousData?: TableResponse;
}

interface ReorderRowsContext {
  previousData?: TableResponse;
}

interface TableResponse {
  success: boolean;
  error?: string;
  table?: {
    id: string;
    name: string;
    baseId: string;
    columns: Array<{
      id: string;
      name: string;
      type: "text" | "number";
      order: number;
    }>;
    rows: Row[];
  };
}

export interface RowOperations {
  deleteRow: (rowId: string) => Promise<{ success: boolean; row?: Row }>;
  bulkDeleteRows: (
    rowIds: string[],
  ) => Promise<{ success: boolean; rows?: Row[] }>;
  reorderRows: (params: {
    rowOrders: { id: string; order: number }[];
  }) => Promise<{ success: boolean; rows?: Row[] }>;
  isDeletingRow: boolean;
  isBulkDeletingRows: boolean;
  isReorderingRows: boolean;
}

export const useRows = (tableId: string): RowOperations => {
  const queryClient = useQueryClient();

  const deleteRowMutation = useMutation<
    RowResponse,
    Error,
    string,
    DeleteRowContext
  >({
    mutationFn: async (rowId: string) => {
      const result = await deleteRow(tableId, rowId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete row");
      }
      return result;
    },
    onMutate: async (rowId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table?.rows) {
        // Get the row being deleted
        const deletedRow = previousData.table.rows.find(
          (row) => row.id === rowId,
        );

        if (deletedRow) {
          // Update rows with new order
          const updatedRows = previousData.table.rows
            .filter((row) => row.id !== rowId)
            .map((row) => {
              const currentOrder = Number(row.order) || 0;
              const deletedOrder = Number(deletedRow.order) || 0;
              return currentOrder > deletedOrder
                ? { ...row, order: currentOrder - 1 }
                : row;
            });

          // Update the cache
          queryClient.setQueryData<TableResponse>(
            queryKeys.tables.detail(tableId),
            {
              ...previousData,
              table: {
                ...previousData.table,
                rows: updatedRows,
              },
            },
          );
        }
      }

      return { previousData };
    },
    onError: (err, rowId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to delete row",
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });
    },
  });

  const bulkDeleteRowsMutation = useMutation<
    RowsResponse,
    Error,
    string[],
    BulkDeleteRowsContext
  >({
    mutationFn: async (rowIds: string[]) => {
      const result = await bulkDeleteRows(tableId, rowIds);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete rows");
      }
      return result;
    },
    onMutate: async (rowIds) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table?.rows) {
        // Get the rows being deleted
        const rowsToDelete = previousData.table.rows.filter((row) =>
          rowIds.includes(row.id),
        );

        if (rowsToDelete.length > 0) {
          // Get the minimum order from deleted rows
          const minOrder = Math.min(
            ...rowsToDelete.map((row) => Number(row.order) || 0),
          );

          // Update remaining rows
          const updatedRows = previousData.table.rows
            .filter((row) => !rowIds.includes(row.id))
            .map((row) => {
              const currentOrder = Number(row.order) || 0;
              return {
                ...row,
                order:
                  currentOrder > minOrder
                    ? currentOrder - rowsToDelete.length
                    : currentOrder,
              };
            });

          // Update the cache
          queryClient.setQueryData<TableResponse>(
            queryKeys.tables.detail(tableId),
            {
              ...previousData,
              table: {
                ...previousData.table,
                rows: updatedRows,
              },
            },
          );
        }
      }

      return { previousData };
    },
    onError: (err, rowIds, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.tables.detail(tableId),
          context.previousData,
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to delete rows",
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });
    },
  });

  const reorderRowsMutation = useMutation<
    RowsResponse,
    Error,
    { rowOrders: { id: string; order: number }[] },
    ReorderRowsContext
  >({
    mutationFn: async ({ rowOrders }) => {
      const result = await updateRowsOrder(tableId, rowOrders);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to reorder rows");
      }
      return result;
    },
    onMutate: async ({ rowOrders }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      const previousData = queryClient.getQueryData<TableResponse>(
        queryKeys.tables.detail(tableId),
      );

      if (previousData?.table) {
        const orderMap = new Map(rowOrders.map((row) => [row.id, row.order]));

        const updatedRows = [...previousData.table.rows].map((row) => ({
          ...row,
          order: orderMap.get(row.id) ?? (Number(row.order) || 0),
        }));

        // Update the cache with sorted rows
        queryClient.setQueryData<TableResponse>(
          queryKeys.tables.detail(tableId),
          {
            ...previousData,
            table: {
              ...previousData.table,
              rows: updatedRows,
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
          err instanceof Error ? err.message : "Failed to reorder rows",
        );
      }
    },
  });

  return {
    deleteRow: (rowId: string) => deleteRowMutation.mutateAsync(rowId),
    bulkDeleteRows: (rowIds: string[]) =>
      bulkDeleteRowsMutation.mutateAsync(rowIds),
    reorderRows: (params: { rowOrders: { id: string; order: number }[] }) =>
      reorderRowsMutation.mutateAsync(params),
    isDeletingRow: deleteRowMutation.isPending,
    isBulkDeletingRows: bulkDeleteRowsMutation.isPending,
    isReorderingRows: reorderRowsMutation.isPending,
  };
};
