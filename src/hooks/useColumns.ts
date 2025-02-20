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
import { type SortingState } from "@tanstack/react-table";
import pages from "next/dist/build/templates/pages";

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

interface InfiniteTableData {
  pages: {
    success: boolean;
    table?: {
      id: string;
      name: string;
      columns: Column[];
      data: Row[];
    };
    pagination: {
      hasMore: boolean;
      page: number;
    };
  }[];
  pageParams: (number | undefined)[];
}

interface AddColumnParams {
  name: string;
  type: "text" | "number";
  defaultValue?: string;
}

export const useColumns = (tableId: string, viewId?: string) => {
  const queryClient = useQueryClient();

  const addColumnMutation = useMutation({
    mutationFn: async ({ name, type, defaultValue }: AddColumnParams) => {
      // Get the current sort state
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      // Use the queryKeys helper
      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      const previousData =
        queryClient.getQueryData<InfiniteTableData>(fullQueryKey);
      console.log("Found data:", previousData);

      if (!previousData?.pages?.[0]?.table) {
        throw new Error("No table data found");
      }

      const firstPage = previousData.pages[0];
      const existingColumns = firstPage.table?.columns ?? [];

      // Generate unique name based on client state
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
        order: existingColumns.length,
        width: 200,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      };

      // Update client state immediately with default values
      queryClient.setQueryData<InfiniteTableData>(fullQueryKey, {
        ...previousData,
        pages: previousData.pages.map((page) => {
          if (!page.success || !page.table) return page;
          return {
            ...page,
            table: {
              ...page.table,
              columns: [...page.table.columns, optimisticColumn],
              data: page.table.data.map((row) => ({
                ...row,
                [optimisticColumn.id]:
                  type === "number" ? 0 : (defaultValue ?? ""),
              })),
            },
          };
        }),
      });

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
    { previousData?: InfiniteTableData }
  >({
    mutationFn: async (columnId: string) => {
      const result = await deleteColumn(tableId, columnId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete column");
      }
      return result;
    },
    onMutate: async (columnId) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: fullQueryKey,
      });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<InfiniteTableData>(fullQueryKey);

      if (previousData?.pages?.[0]?.table?.columns) {
        const firstPage = previousData.pages[0];
        // Get the column being deleted
        const deletedColumn = firstPage.table?.columns.find(
          (col) => col.id === columnId,
        );

        if (deletedColumn) {
          // Update the cache with new data
          queryClient.setQueryData<InfiniteTableData>(fullQueryKey, {
            ...previousData,
            pages: previousData.pages.map((page) => {
              if (!page.success || !page.table) return page;

              // Update columns with new order
              const updatedColumns = page.table.columns
                .filter((col) => col.id !== columnId)
                .map((col) =>
                  col.order > deletedColumn.order
                    ? { ...col, order: col.order - 1 }
                    : col,
                );

              // Update data by removing the deleted column's data
              const updatedData = page.table.data.map((row: Row) => {
                const newRow = { ...row };
                delete newRow[columnId];
                return newRow;
              });

              return {
                ...page,
                table: {
                  ...page.table,
                  columns: updatedColumns,
                  data: updatedData,
                },
              };
            }),
          });
        }
      }

      return { previousData };
    },
    onError: (err, columnId, context) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      if (context?.previousData) {
        queryClient.setQueryData(fullQueryKey, context.previousData);
      }
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      void queryClient.invalidateQueries({
        queryKey: fullQueryKey,
      });
    },
  });

  const renameColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    { columnId: string; newName: string },
    { previousData?: InfiniteTableData }
  >({
    mutationFn: async ({ columnId, newName }) => {
      const result = await renameColumn(tableId, columnId, newName);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to rename column");
      }
      return result;
    },
    onMutate: async ({ columnId, newName }) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: fullQueryKey,
      });

      // Snapshot the previous value
      const previousData =
        queryClient.getQueryData<InfiniteTableData>(fullQueryKey);

      if (!previousData?.pages) {
        return { previousData };
      }

      // Update all pages in the cache
      queryClient.setQueryData<InfiniteTableData>(fullQueryKey, {
        ...previousData,
        pages: previousData.pages.map((page) => {
          if (!page.success || !page.table) return page;

          // Update the column name in the columns array
          const updatedColumns = page.table.columns.map((col) =>
            col.id === columnId ? { ...col, name: newName } : col,
          );

          return {
            ...page,
            table: {
              ...page.table,
              columns: updatedColumns,
            },
          };
        }),
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      if (context?.previousData) {
        queryClient.setQueryData(fullQueryKey, context.previousData);
      }
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      void queryClient.invalidateQueries({
        queryKey: fullQueryKey,
      });
    },
  });

  const reorderColumnsMutation = useMutation<
    { success: boolean; columns?: Column[] },
    Error,
    { columnOrders: { id: string; order: number }[] },
    { previousData?: InfiniteTableData }
  >({
    mutationFn: async ({ columnOrders }) => {
      const result = await updateColumnsOrder(tableId, columnOrders);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to reorder columns");
      }
      return result;
    },
    onMutate: async ({ columnOrders }) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      await queryClient.cancelQueries({
        queryKey: fullQueryKey,
      });

      const previousData =
        queryClient.getQueryData<InfiniteTableData>(fullQueryKey);

      if (previousData?.pages) {
        const orderMap = new Map(
          columnOrders.map((col) => [col.id, col.order]),
        );

        queryClient.setQueryData<InfiniteTableData>(fullQueryKey, {
          ...previousData,
          pages: previousData.pages.map((page) => {
            if (!page.success || !page.table) return page;

            const updatedColumns = [...page.table.columns].map((col) => ({
              ...col,
              order: orderMap.get(col.id) ?? col.order,
            }));

            return {
              ...page,
              table: {
                ...page.table,
                columns: updatedColumns,
              },
            };
          }),
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.customizations.sorts(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(sortState),
          ]
        : ["tables", tableId, "data"];

      if (context?.previousData) {
        queryClient.setQueryData(fullQueryKey, context.previousData);
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
