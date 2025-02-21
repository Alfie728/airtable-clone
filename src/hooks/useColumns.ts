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
import { type FilterPreference } from "~/types/filter";
import { queryClient } from "~/lib/query";

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
      const result = await addColumn(tableId, name, type, defaultValue ?? "");
      if (!result.success) {
        throw new Error(result.error ?? "Failed to add column");
      }
      return result;
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      void queryClient.invalidateQueries({
        queryKey: fullQueryKey,
      });

      // Also invalidate the table structure
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.structure.columns(tableId),
      });
    },
  });

  const deleteColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    string
  >({
    mutationFn: async (columnId: string) => {
      const result = await deleteColumn(tableId, columnId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete column");
      }
      return result;
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete column",
      );
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const tableDataQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      const tableStructureQueryKey =
        queryKeys.tables.structure.columns(tableId);

      // Invalidate specific queries
      void queryClient.invalidateQueries({ queryKey: tableDataQueryKey });
      void queryClient.invalidateQueries({ queryKey: tableStructureQueryKey });

      // Also invalidate view configuration if in a view
      if (viewId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.views.structure.configuration.root(viewId),
        });
      }
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
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

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
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      if (context?.previousData) {
        queryClient.setQueryData(fullQueryKey, context.previousData);
      }
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      void queryClient.invalidateQueries({
        queryKey: fullQueryKey,
      });

      // Also invalidate the table structure
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.structure.columns(tableId),
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
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

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
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      if (context?.previousData) {
        queryClient.setQueryData(fullQueryKey, context.previousData);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder columns",
        );
      }
    },
    onSettled: () => {
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      const fullQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      void queryClient.invalidateQueries({
        queryKey: fullQueryKey,
      });

      // Also invalidate the table structure
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tables.structure.columns(tableId),
      });
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
