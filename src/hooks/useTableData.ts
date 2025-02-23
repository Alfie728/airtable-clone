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
import { useTableFilter } from "./useTableFilter";
import type { SortingState } from "@tanstack/react-table";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import type {
  Row,
  Column,
  TableResponse,
  TableRenameResponse,
  SerializedTable,
  TableData,
} from "~/types/table";
import { faker } from "@faker-js/faker";
import { useTableStructure } from "./useTableStructure";
import type { FilterPreference } from "~/types/filter";

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
  response: TableResponse,
): response is { success: true; table: TableData } {
  return response.success;
}

function isErrorResponse(
  response: TableResponse,
): response is { success: false; error: string } {
  return !response.success;
}

export function useTableData({
  baseId,
  tableId,
  tableName,
  viewId,
}: {
  baseId: string;
  tableId: string;
  tableName: string;
  viewId: string;
}) {
  const queryClient = useQueryClient();
  const previousFilterStateRef = useRef<FilterPreference[]>([]);
  const isInitialLoadRef = useRef(true);
  const previousViewIdRef = useRef<string | null>(null);

  // States
  const [sortState, setSortState] = useState<SortingState>([]);
  const [filterState, setFilterState] = useState<FilterPreference[]>([]);
  const [searchValue, setSearchValue] = useState("");

  const {
    initialFilterState,
    updateFilter,
    isUpdating: isUpdatingFilter,
  } = useTableFilter(viewId === "loading" ? "" : viewId);

  const {
    initialSortState,
    updateSort,
    isUpdating: isUpdatingSort,
  } = useTableSort(viewId === "loading" ? "" : viewId);

  const { data: structureData, isLoading: isLoadingStructure } =
    useTableStructure(tableId);

  // Combined effect to handle both sort and filter state updates
  useEffect(() => {
    if (viewId === "loading") return;

    const shouldUpdateFilter =
      initialFilterState &&
      (isInitialLoadRef.current ||
        previousViewIdRef.current !== viewId ||
        JSON.stringify(initialFilterState) !==
          JSON.stringify(previousFilterStateRef.current));

    const shouldUpdateSort =
      initialSortState &&
      (isInitialLoadRef.current ||
        previousViewIdRef.current !== viewId ||
        JSON.stringify(initialSortState) !== JSON.stringify(sortState));

    if (shouldUpdateFilter || shouldUpdateSort) {
      if (shouldUpdateFilter) {
        setFilterState(initialFilterState ?? []);
        previousFilterStateRef.current = initialFilterState ?? [];
      }

      if (shouldUpdateSort) {
        setSortState(initialSortState ?? []);
      }

      if (isInitialLoadRef.current || previousViewIdRef.current !== viewId) {
        isInitialLoadRef.current = false;
        previousViewIdRef.current = viewId;
      }
    }
  }, [initialFilterState, initialSortState, viewId, sortState]);

  // Reset refs when tableId changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    previousViewIdRef.current = null;
    previousFilterStateRef.current = [];
    setFilterState([]);
    setSortState([]);
    setSearchValue("");
  }, [tableId]);

  // Memoize the filter change handler with stable dependencies
  const handleFilterChange = useCallback(
    async (newFiltering: FilterPreference[]) => {
      const prevFiltering = previousFilterStateRef.current;

      // Skip if no actual change
      if (JSON.stringify(newFiltering) === JSON.stringify(prevFiltering)) {
        return;
      }

      try {
        // Update state first
        setFilterState(newFiltering);
        previousFilterStateRef.current = newFiltering;

        if (viewId) {
          // Update server
          await updateFilter(newFiltering);

          // Only invalidate after successful server update
          void queryClient.invalidateQueries({
            queryKey: queryKeys.views.data.withConfig(tableId, viewId, {
              sorts: JSON.stringify(sortState),
              filters: JSON.stringify(newFiltering),
              search: searchValue,
              page: 1,
            }),
          });
        }
      } catch (error) {
        // Revert on error
        setFilterState(prevFiltering);
        previousFilterStateRef.current = prevFiltering;
      }
    },
    [tableId, viewId, sortState, searchValue, updateFilter, queryClient],
  );

  // Memoize search change handler
  const handleSearchChange = useCallback(
    (newSearchValue: string) => {
      if (newSearchValue !== searchValue) {
        setSearchValue(newSearchValue);
      }
    },
    [searchValue],
  );

  // Memoize the query key to prevent unnecessary updates
  const queryKey = useMemo(() => {
    return viewId
      ? queryKeys.views.data.withConfig(tableId, viewId, {
          sorts: JSON.stringify(sortState),
          filters: JSON.stringify(filterState),
          search: searchValue,
          page: 1,
        })
      : queryKeys.tables.data.root(tableId);
  }, [tableId, viewId, sortState, filterState, searchValue]);

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingData,
    error,
  } = useInfiniteQuery<TableResponse, Error>({
    queryKey,
    queryFn: async ({ pageParam }): Promise<TableResponse> => {
      const response = await getTableDataWithSort({
        tableId,
        tableName,
        sorting: initialSortState,
        filtering: filterState,
        globalSearch: searchValue,
        page: pageParam as number,
      });

      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      return response;
    },
    getNextPageParam: (lastPage): number | undefined => {
      if (!lastPage.success) return undefined;
      if (!isSuccessResponse(lastPage)) return undefined;
      const { table } = lastPage;
      const { pagination } = table;
      return pagination.hasMore ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(tableId && tableName && structureData?.success),
    staleTime: 30000,
    refetchOnMount: true,
    maxPages: undefined, // Allow unlimited pages
  });

  // Combine all pages of data
  const tableData = useMemo(() => {
    if (!pages?.pages || pages.pages.length === 0 || !structureData?.success)
      return undefined;

    const firstPage = pages.pages[0];
    if (!firstPage?.success) return undefined;
    if (!isSuccessResponse(firstPage)) return undefined;
    const { table } = firstPage;

    // Combine data from all pages
    const allData = pages.pages.reduce<Row[]>((acc, page) => {
      if (page && isSuccessResponse(page)) {
        return [...acc, ...page.table.data];
      }
      return acc;
    }, []);

    const result: TableData = {
      ...table,
      columns: structureData.columns ?? [],
      data: allData,
    };

    return result;
  }, [pages?.pages, structureData]);

  const isLoading = isLoadingStructure || isLoadingData;

  // Add row mutation
  const addRowMutation = useMutation<AddRowResponse, Error, Row, AddRowContext>(
    {
      mutationFn: async (optimisticRow) => {
        const promise = addRow(tableId, optimisticRow);
        return promise;
      },
      onMutate: async (optimisticRow): Promise<AddRowContext> => {
        await queryClient.cancelQueries({ queryKey });
        const previousData =
          queryClient.getQueryData<InfiniteTableData>(queryKey);

        if (tableData) {
          const maxOrder = Math.max(
            ...tableData.data.map((row) => row.order),
            -1,
          );
          const rowWithOrder = { ...optimisticRow, order: maxOrder + 1 };

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
          queryClient.setQueryData(queryKey, context.previousData);
        }
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
          const result = await addCell(
            params.rowId,
            params.columnId,
            params.value,
          );

          if (!result.success) {
            if (
              result.error?.includes("Row not found") ||
              result.error?.includes("Column not found")
            ) {
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
      await queryClient.cancelQueries({ queryKey });
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
      const promise = addBulkRows(tableId, params.optimisticRows);
      return promise;
    },
    onMutate: async (params): Promise<AddBulkRowsContext> => {
      await queryClient.cancelQueries({ queryKey });
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
        queryClient.setQueryData(queryKey, context.previousData);
      }
      variables.optimisticRows.forEach((row) => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tables.data.root(tableId),
        });
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
        queryKey: queryKeys.tables.data.root(tableId),
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

  return {
    tableData,
    isLoading,
    error,
    addRow: () => {
      if (!tableData?.columns)
        return Promise.reject(new Error("No columns found"));
      const optimisticRow = generateMockRow(tableData.columns);
      return addRowMutation.mutateAsync(optimisticRow);
    },
    addBulkRows: (count: number) => {
      if (!tableData?.columns)
        return Promise.reject(new Error("No columns found"));
      const optimisticRows = Array.from({ length: count }, () =>
        generateMockRow(tableData.columns),
      );
      return addBulkRowsMutation.mutateAsync({ optimisticRows });
    },
    updateCell: updateCellMutation.mutateAsync,
    isAddingRow: addRowMutation.isPending,
    isBatchAdding: addBulkRowsMutation.isPending,
    renameTable: (newName: string) => renameMutation.mutateAsync(newName),
    isRenaming: renameMutation.isPending,
    sortState,
    handleSortChange: updateSort,
    filterState,
    handleFilterChange,
    searchValue,
    handleSearchChange,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isUpdatingSort,
    isUpdatingFilter,
  };
}
