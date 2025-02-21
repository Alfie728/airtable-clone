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
      // Get existing columns to generate unique name
      const tableStructure = queryClient.getQueryData<{
        success: boolean;
        columns: Column[];
      }>(queryKeys.tables.structure.columns(tableId));

      const existingColumns = tableStructure?.columns ?? [];

      // Generate unique name based on server state
      let uniqueName = name;
      let counter = 1;
      while (existingColumns.some((col) => col.name === uniqueName)) {
        uniqueName = `${name} ${counter}`;
        counter++;
      }

      // Use the same default value logic as optimistic update
      const defaultValueToUse = type === "number" ? "0" : (defaultValue ?? "");

      // Sync with server using the unique name and default value
      const result = await addColumn(
        tableId,
        uniqueName,
        type,
        defaultValueToUse,
      );
      if (!result.success) {
        throw new Error(result.error ?? "Failed to add column");
      }
      return result;
    },
    onMutate: async ({ name, type, defaultValue }: AddColumnParams) => {
      // Get the current sort state
      const sortState = viewId
        ? (queryClient.getQueryData<SortingState>(
            queryKeys.views.structure.configuration.sorts(viewId),
          ) ?? [])
        : [];

      // Get the current filter state
      const filterState = viewId
        ? (queryClient.getQueryData<FilterPreference[]>(
            queryKeys.views.structure.configuration.filters(viewId),
          ) ?? [])
        : [];

      // Use the queryKeys helper for table data
      const tableDataQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      // Use the queryKey for table structure
      const tableStructureQueryKey =
        queryKeys.tables.structure.columns(tableId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: tableDataQueryKey });
      await queryClient.cancelQueries({ queryKey: tableStructureQueryKey });

      // Get previous data states
      const previousTableData =
        queryClient.getQueryData<InfiniteTableData>(tableDataQueryKey);
      const previousTableStructure = queryClient.getQueryData<{
        success: boolean;
        columns: Column[];
      }>(tableStructureQueryKey);

      if (!previousTableData?.pages?.[0]?.table) {
        return {
          previousData: {
            tableData: previousTableData,
            tableStructure: previousTableStructure,
          },
        };
      }

      const firstPage = previousTableData.pages[0];
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

      // Use consistent default value
      const defaultValueToUse = type === "number" ? "0" : (defaultValue ?? "");

      // Update table data state
      queryClient.setQueryData<InfiniteTableData>(tableDataQueryKey, {
        ...previousTableData,
        pages: previousTableData.pages.map((page) => {
          if (!page.success || !page.table) return page;
          return {
            ...page,
            table: {
              ...page.table,
              columns: [...page.table.columns, optimisticColumn],
              data: page.table.data.map((row) => ({
                ...row,
                [optimisticColumn.id]: defaultValueToUse,
              })),
            },
          };
        }),
      });

      // Update table structure state
      if (previousTableStructure?.success) {
        queryClient.setQueryData<{ success: boolean; columns: Column[] }>(
          tableStructureQueryKey,
          {
            success: true,
            columns: [...previousTableStructure.columns, optimisticColumn],
          },
        );
      } else {
        // If no previous structure exists, create a new one
        queryClient.setQueryData<{ success: boolean; columns: Column[] }>(
          tableStructureQueryKey,
          {
            success: true,
            columns: [optimisticColumn],
          },
        );
      }

      return {
        previousData: {
          tableData: previousTableData,
          tableStructure: previousTableStructure,
        },
      };
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

      const tableDataQueryKey = viewId
        ? queryKeys.views.data.withConfig(tableId, viewId, {
            sorts: JSON.stringify(sortState),
            filters: JSON.stringify(filterState),
            page: 1,
          })
        : queryKeys.tables.data.root(tableId);

      const tableStructureQueryKey =
        queryKeys.tables.structure.columns(tableId);

      if (context?.previousData) {
        // Restore both states
        queryClient.setQueryData(
          tableDataQueryKey,
          context.previousData.tableData,
        );
        queryClient.setQueryData(
          tableStructureQueryKey,
          context.previousData.tableStructure,
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

  const deleteColumnMutation = useMutation<
    { success: boolean; column?: Column },
    Error,
    string,
    {
      previousData?: {
        tableData: InfiniteTableData;
        tableStructure: { success: boolean; columns: Column[] } | undefined;
      };
    }
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

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: tableDataQueryKey });
      await queryClient.cancelQueries({ queryKey: tableStructureQueryKey });

      // Get previous data states
      const previousTableData =
        queryClient.getQueryData<InfiniteTableData>(tableDataQueryKey);
      const previousTableStructure = queryClient.getQueryData<{
        success: boolean;
        columns: Column[];
      }>(tableStructureQueryKey);

      if (!previousTableData?.pages?.[0]?.table) {
        return {
          previousData: {
            tableData: previousTableData ?? {
              pages: [],
              pageParams: [],
            },
            tableStructure: previousTableStructure,
          },
        };
      }

      const firstPage = previousTableData.pages[0];
      // Ensure table exists since we checked above
      const table = firstPage.table!;
      const deletedColumn = table.columns.find((col) => col.id === columnId);

      if (deletedColumn) {
        // Update table data state - remove column from all rows
        queryClient.setQueryData<InfiniteTableData>(tableDataQueryKey, {
          ...previousTableData,
          pages: previousTableData.pages.map((page) => {
            if (!page.success || !page.table) return page;

            // Update columns with new order
            const updatedColumns = page.table.columns
              .filter((col) => col.id !== columnId)
              .map((col) =>
                col.order > deletedColumn.order
                  ? { ...col, order: col.order - 1 }
                  : col,
              );

            // Remove column data from all rows while preserving Row type
            const updatedData = page.table.data.map((row) => {
              const { [columnId]: _, ...rest } = row;
              return rest as Row; // Safe cast since we're only removing a property
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

        // Update table structure state
        if (previousTableStructure?.success) {
          const updatedColumns = previousTableStructure.columns
            .filter((col) => col.id !== columnId)
            .map((col) =>
              col.order > deletedColumn.order
                ? { ...col, order: col.order - 1 }
                : col,
            );

          queryClient.setQueryData<{ success: boolean; columns: Column[] }>(
            tableStructureQueryKey,
            {
              success: true,
              columns: updatedColumns,
            },
          );
        }
      }

      return {
        previousData: {
          tableData: previousTableData,
          tableStructure: previousTableStructure,
        },
      };
    },
    onError: (err, columnId, context) => {
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

      if (context?.previousData) {
        // Restore both states
        queryClient.setQueryData(
          tableDataQueryKey,
          context.previousData.tableData,
        );
        queryClient.setQueryData(
          tableStructureQueryKey,
          context.previousData.tableStructure,
        );
      }
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

      // Invalidate specific queries like in addColumnMutation
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
