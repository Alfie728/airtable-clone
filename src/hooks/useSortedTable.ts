import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import { getTableDataWithSort } from "~/lib/actions/tables.action";
import { useTableSort } from "./useTableSort";
import type { SortingState } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Row, Column } from "~/types/table";
import { getViewSorts } from "~/lib/actions/sort.action";

// Define the response type for getSortedTableData
interface SortedTableResponse {
  success: boolean;
  error?: string;
  table?: {
    id: string;
    name: string;
    columns: {
      id: string;
      name: string;
      type: "text" | "number";
      order: number;
      width: number;
      isSearchable: boolean;
      isSortable: boolean;
      isVisible: boolean;
    }[];
    data: Row[];
  };
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export function useSortedTable(
  tableId: string,
  viewId: string,
  tableName: string,
) {
  const queryClient = useQueryClient();
  const {
    initialSortState,
    updateSort,
    isUpdating: isUpdatingSort,
  } = useTableSort(viewId);

  // Query for sorted data with infinite pagination
  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isSortingData,
    error: sortError,
  } = useInfiniteQuery<SortedTableResponse>({
    queryKey: queryKeys.views.data.withConfig(tableId, viewId, {
      sorts: JSON.stringify(initialSortState),
      page: 1,
    }),
    queryFn: async ({ pageParam }) => {
      const sortState =
        queryClient.getQueryData<SortingState>(
          queryKeys.views.structure.configuration.sorts(viewId),
        ) ?? [];

      return getTableDataWithSort({
        tableId,
        tableName,
        sorting: sortState,
        page: typeof pageParam === "number" ? pageParam : 1,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || !lastPage.pagination?.hasMore) {
        return undefined;
      }
      return lastPage.pagination.page + 1;
    },
    initialPageParam: 1,
    enabled: Boolean(tableId && viewId && tableName),
    staleTime: 0, // Always consider data stale when sorting changes
    refetchOnMount: true,
    maxPages: undefined, // Allow unlimited pages
  });

  // Combine all pages of data
  const sortedData = useMemo(() => {
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

  return {
    sortedData,
    isLoading: isSortingData,
    error: sortError,
    sortState: initialSortState ?? [],
    handleSortChange: updateSort,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isUpdatingSort,
  };
}
