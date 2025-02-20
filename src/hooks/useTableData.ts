import {
  useQueryClient,
  useInfiniteQuery,
  useMutation,
} from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import {
  getTableDataWithSort,
  addRow,
  addBulkRows,
  addCell,
  renameTable,
} from "~/lib/actions/tables.action";
import { useTableSort } from "./useTableSort";
import type { SortingState } from "@tanstack/react-table";
import { useMemo, useRef } from "react";
import type {
  Row,
  Column,
  TableResponse,
  TableRenameResponse,
  SerializedTable,
} from "~/types/table";
import { faker } from "@faker-js/faker";
import pages from "next/dist/build/templates/pages";

function generateMockRow(columns: Column[]): Row {
  const row: Row = {
    id: crypto.randomUUID(),
    order: 0, // Will be updated with correct order when adding to table data
  };

  columns.forEach((column) => {
    if (column.type === "text") {
      row[column.id] = generateTextValue(column.name.toLowerCase());
    } else if (column.type === "number") {
      row[column.id] = generateNumberValue(column.name.toLowerCase());
    }
  });

  return row;
}

function generateTextValue(columnName: string): string {
  switch (columnName) {
    case "name":
      return faker.person.fullName();
    case "notes":
      return faker.lorem.sentence();
    case "email":
      return faker.internet.email();
    case "phone":
      return faker.phone.number({ style: "national" });
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

interface UseTableDataParams {
  tableId: string;
  tableName: string;
  viewId?: string;
  baseId: string;
}

interface TableDataResponse {
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
  error?: string;
}

interface AddRowResponse {
  success: boolean;
  row?: {
    tableId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    order: number;
  };
  error?: string;
}

interface UpdateCellResponse {
  success: boolean;
  cell?: {
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    value: string;
    displayValue: string | null;
    rowId: string;
    columnId: string;
    searchVector: "tsvector";
  };
  error?: string;
}

interface AddBulkRowsResponse {
  success: boolean;
  rows?: {
    tableId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date | null;
    order: number;
  }[];
  error?: string;
}

interface InfiniteTableData {
  pages: TableDataResponse[];
  pageParams: (number | undefined)[];
}

interface AddRowContext {
  previousData: InfiniteTableData | undefined;
}

interface UpdateCellContext {
  previousData: InfiniteTableData | undefined;
}

interface AddBulkRowsContext {
  previousData: InfiniteTableData | undefined;
}

interface RenameTableContext {
  previousTables:
    | {
        success: boolean;
        tables: SerializedTable[];
      }
    | undefined;
}

type GetTableDataResponse =
  | {
      success: true;
      table: {
        id: string;
        name: string;
        columns: Column[];
        data: Row[];
        pagination: {
          total: number;
          page: number;
          pageSize: number;
          hasMore: boolean;
        };
      };
    }
  | {
      success: false;
      error: string;
    };

function isSuccessResponse(
  response: GetTableDataResponse,
): response is Extract<GetTableDataResponse, { success: true }> {
  return response.success;
}

export function useTableData({
  tableId,
  tableName,
  viewId,
  baseId,
}: UseTableDataParams) {
  const queryClient = useQueryClient();
  const latestMutationRef = useRef<string | null>(null);
  const pendingRowCreationsRef = useRef<Map<string, Promise<unknown>>>(
    new Map(),
  );

  // Get sorting state if viewId is provided
  const {
    initialSortState,
    updateSort,
    isUpdating: isUpdatingSort,
  } = useTableSort(viewId ?? "");

  // Query for table data with infinite pagination
  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<TableDataResponse, Error>({
    queryKey: viewId
      ? [
          ...queryKeys.tables.viewData(tableId, viewId),
          JSON.stringify(initialSortState),
        ]
      : ["tables", tableId, "data"],
    queryFn: async ({ pageParam }) => {
      const response = (await getTableDataWithSort({
        tableId,
        tableName,
        sorting: viewId ? initialSortState : undefined,
        page: pageParam as number,
      })) as GetTableDataResponse;

      // Transform the response to match TableDataResponse
      if (!isSuccessResponse(response)) {
        return {
          success: false,
          error: response.error,
          pagination: {
            hasMore: false,
            page: pageParam as number,
          },
        } satisfies TableDataResponse;
      }

      return {
        success: true,
        table: {
          id: response.table.id,
          name: response.table.name,
          columns: response.table.columns,
          data: response.table.data,
        },
        pagination: {
          hasMore: response.table.pagination.hasMore,
          page: response.table.pagination.page,
        },
      } satisfies TableDataResponse;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || !lastPage.pagination) return undefined;
      return lastPage.pagination.hasMore
        ? lastPage.pagination.page + 1
        : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(tableId && tableName),
    staleTime: 30000,
    refetchOnMount: true,
    maxPages: undefined, // Allow unlimited pages
  });

  // Combine all pages of data
  const tableData = useMemo(() => {
    if (!pages?.pages || pages.pages.length === 0) return undefined;

    const firstPage = pages.pages[0];
    if (!firstPage?.success || !firstPage.table) return undefined;

    // Combine data from all pages
    const allData = pages.pages.reduce<Row[]>((acc, page) => {
      if (page?.success && page.table) {
        return [...acc, ...page.table.data];
      }
      return acc;
    }, []);

    return {
      ...firstPage.table,
      data: allData,
    };
  }, [pages?.pages]);

  // Add row mutation
  const addRowMutation = useMutation<AddRowResponse, Error, Row, AddRowContext>(
    {
      mutationFn: async (optimisticRow) => {
        latestMutationRef.current = "addRow";
        const promise = addRow(tableId, optimisticRow);
        pendingRowCreationsRef.current.set(optimisticRow.id, promise);
        return promise;
      },
      onMutate: async (optimisticRow): Promise<AddRowContext> => {
        const queryKey = viewId
          ? [
              ...queryKeys.tables.viewData(tableId, viewId),
              JSON.stringify(initialSortState),
            ]
          : queryKeys.tables.data(tableId);

        await queryClient.cancelQueries({
          queryKey,
        });
        const previousData =
          queryClient.getQueryData<InfiniteTableData>(queryKey);

        if (tableData) {
          const maxOrder = Math.max(
            ...tableData.data.map((row) => row.order),
            -1,
          );

          const rowWithOrder = {
            ...optimisticRow,
            order: maxOrder + 1,
          };

          queryClient.setQueryData<InfiniteTableData>(queryKey, (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) => {
                if (index === 0 && page.success && page.table) {
                  return {
                    ...page,
                    table: {
                      ...page.table,
                      data: [...page.table.data, rowWithOrder],
                    },
                  };
                }
                return page;
              }),
            };
          });
        }

        return { previousData };
      },
      onError: (err, variables, context) => {
        if (context?.previousData) {
          const queryKey = viewId
            ? [
                ...queryKeys.tables.viewData(tableId, viewId),
                JSON.stringify(initialSortState),
              ]
            : queryKeys.tables.data(tableId);
          queryClient.setQueryData(queryKey, context.previousData);
        }
        pendingRowCreationsRef.current.delete(variables.id);
      },
    },
  );

  // Update cell mutation
  const updateCellMutation = useMutation<
    UpdateCellResponse,
    Error,
    { rowId: string; columnId: string; value: string },
    UpdateCellContext
  >({
    mutationFn: async (params) => {
      const MAX_RETRIES = 5;
      const INITIAL_DELAY = 1000;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          const pendingCreation = pendingRowCreationsRef.current.get(
            params.rowId,
          );
          if (pendingCreation) {
            await pendingCreation;
          }

          latestMutationRef.current = "updateCell";
          const result = await addCell(
            params.rowId,
            params.columnId,
            params.value,
          );

          if (!result.success) {
            if (result.error?.includes("Row not found")) {
              retryCount++;
              if (retryCount < MAX_RETRIES) {
                await new Promise((resolve) =>
                  setTimeout(
                    resolve,
                    INITIAL_DELAY * Math.pow(2, retryCount - 1),
                  ),
                );
                continue;
              }
            }
            throw new Error(result.error ?? "Cell update failed");
          }

          return result;
        } catch (error) {
          if (retryCount === MAX_RETRIES - 1) {
            throw error;
          }
          retryCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, INITIAL_DELAY * Math.pow(2, retryCount - 1)),
          );
        }
      }

      throw new Error("Max retries exceeded");
    },
    onMutate: async (params): Promise<UpdateCellContext> => {
      const queryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(initialSortState),
          ]
        : queryKeys.tables.data(tableId);

      if (!pendingRowCreationsRef.current.has(params.rowId)) {
        await queryClient.cancelQueries({
          queryKey,
        });
      }

      const previousData =
        queryClient.getQueryData<InfiniteTableData>(queryKey);

      if (tableData) {
        queryClient.setQueryData<InfiniteTableData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => {
              if (page.success && page.table) {
                return {
                  ...page,
                  table: {
                    ...page.table,
                    data: page.table.data.map((row) => {
                      if (row.id === params.rowId) {
                        return {
                          ...row,
                          [params.columnId]: params.value,
                        };
                      }
                      return row;
                    }),
                  },
                };
              }
              return page;
            }),
          };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        const queryKey = viewId
          ? [
              ...queryKeys.tables.viewData(tableId, viewId),
              JSON.stringify(initialSortState),
            ]
          : queryKeys.tables.data(tableId);
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  });

  // Add bulk rows mutation
  const addBulkRowsMutation = useMutation<
    AddBulkRowsResponse,
    Error,
    { optimisticRows: Row[] },
    AddBulkRowsContext
  >({
    mutationFn: async (params) => {
      latestMutationRef.current = "addBulkRows";
      const promise = addBulkRows(tableId, params.optimisticRows);
      params.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.set(row.id, promise);
      });
      return promise;
    },
    onMutate: async (params): Promise<AddBulkRowsContext> => {
      const queryKey = viewId
        ? [
            ...queryKeys.tables.viewData(tableId, viewId),
            JSON.stringify(initialSortState),
          ]
        : queryKeys.tables.data(tableId);

      await queryClient.cancelQueries({
        queryKey,
      });
      const previousData =
        queryClient.getQueryData<InfiniteTableData>(queryKey);

      if (tableData) {
        const maxOrder = Math.max(
          ...tableData.data.map((row) => row.order),
          -1,
        );

        const rowsWithOrder = params.optimisticRows.map((row, index) => ({
          ...row,
          order: maxOrder + 1 + index,
        }));

        queryClient.setQueryData<InfiniteTableData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index === 0 && page.success && page.table) {
                return {
                  ...page,
                  table: {
                    ...page.table,
                    data: [...page.table.data, ...rowsWithOrder],
                  },
                };
              }
              return page;
            }),
          };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        const queryKey = viewId
          ? [
              ...queryKeys.tables.viewData(tableId, viewId),
              JSON.stringify(initialSortState),
            ]
          : queryKeys.tables.data(tableId);
        queryClient.setQueryData(queryKey, context.previousData);
      }
      variables.optimisticRows.forEach((row) => {
        pendingRowCreationsRef.current.delete(row.id);
      });
    },
  });

  // Rename table mutation
  const renameMutation = useMutation<
    TableRenameResponse,
    Error,
    string,
    RenameTableContext
  >({
    mutationFn: async (newName: string) => {
      latestMutationRef.current = "renameTable";
      const result = await renameTable(tableId, newName);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to rename table");
      }
      return result;
    },
    onMutate: async (newName): Promise<RenameTableContext> => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.bases.tables.list(baseId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.tables.data(tableId),
      });

      const previousTables = queryClient.getQueryData<{
        success: boolean;
        tables: SerializedTable[];
      }>(queryKeys.bases.tables.list(baseId));

      if (previousTables?.tables) {
        queryClient.setQueryData<{
          success: boolean;
          tables: SerializedTable[];
        }>(queryKeys.bases.tables.list(baseId), {
          ...previousTables,
          tables: previousTables.tables.map((table) =>
            table.id === tableId ? { ...table, name: newName } : table,
          ),
        });
      }

      return { previousTables };
    },
    onError: (error, newName, context) => {
      // Revert optimistic updates on error
      if (context?.previousTables) {
        queryClient.setQueryData(
          queryKeys.bases.tables.list(baseId),
          context.previousTables,
        );
      }
    },
  });

  // Function to handle sort changes
  const handleSortChange = async (newSorting: SortingState) => {
    if (!viewId) return;
    try {
      // Optimistically update the sort state
      queryClient.setQueryData<SortingState>(
        queryKeys.views.customizations.sorts(viewId),
        newSorting,
      );

      // Update the sort state in the database
      await updateSort(newSorting);

      // Invalidate the table data to reflect the new sort state
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.tables.viewData(tableId, viewId)],
      });
    } catch (error) {
      // On error, revert the optimistic update
      queryClient.setQueryData(
        queryKeys.views.customizations.sorts(viewId),
        initialSortState ?? [],
      );
      throw error;
    }
  };

  return {
    tableData,
    isLoading,
    error,
    addRow: () => {
      const columns = tableData?.columns ?? [];
      const optimisticRow = generateMockRow(columns);
      return addRowMutation.mutateAsync(optimisticRow);
    },
    addBulkRows: (count: number) => {
      const columns = tableData?.columns ?? [];
      const optimisticRows = Array.from({ length: count }, () =>
        generateMockRow(columns),
      );
      return addBulkRowsMutation.mutateAsync({ optimisticRows });
    },
    updateCell: updateCellMutation.mutateAsync,
    isAddingRow: addRowMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
    isBatchAdding: addBulkRowsMutation.isPending,
    renameTable: (newName: string) => renameMutation.mutateAsync(newName),
    isRenaming: renameMutation.isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sortState: initialSortState ?? [],
    handleSortChange,
    isUpdatingSort,
  };
}
