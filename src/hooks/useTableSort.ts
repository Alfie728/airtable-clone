import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { updateViewSort, getViewSorts } from "~/lib/actions/sort.action";
import type { SortingState } from "@tanstack/react-table";
import { queryKeys } from "~/lib/query/keys";
import { toast } from "sonner";

interface TableSortContext {
  previousSorting?: SortingState;
}

export function useTableSort(viewId: string) {
  const queryClient = useQueryClient();

  // Helper function to validate UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Query for initial sort state
  const { data: initialSortState } = useQuery<SortingState>({
    queryKey: queryKeys.views.structure.configuration.sorts(viewId),
    queryFn: async () => {
      if (!viewId || viewId === "loading") return [];
      if (!isValidUUID(viewId)) {
        console.warn("Invalid UUID format for viewId:", viewId);
        return [];
      }
      const result = await getViewSorts(viewId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to get view sorts");
      }
      return (result.sorts ?? []).map((sort) => ({
        id: sort.columnId,
        desc: sort.direction === "desc",
      }));
    },
    staleTime: 30000,
    enabled: Boolean(viewId) && viewId !== "loading" && isValidUUID(viewId),
  });

  // Mutation for updating sort state
  const updateSortMutation = useMutation<
    { success: boolean },
    Error,
    SortingState,
    TableSortContext
  >({
    mutationFn: async (sorting) => {
      if (!viewId || viewId === "loading" || !isValidUUID(viewId))
        return { success: true };
      const result = await updateViewSort(
        viewId,
        sorting.map((sort) => ({
          columnId: sort.id,
          direction: sort.desc ? "desc" : "asc",
        })),
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to update sort");
      }

      return { success: true };
    },
    onMutate: async (newSorting) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.views.structure.configuration.sorts(viewId),
      });

      const previousSorting = queryClient.getQueryData<SortingState>(
        queryKeys.views.structure.configuration.sorts(viewId),
      );

      // Update the cache optimistically
      queryClient.setQueryData<SortingState>(
        queryKeys.views.structure.configuration.sorts(viewId),
        newSorting,
      );

      return { previousSorting };
    },
    onError: (err, newSorting, context) => {
      if (context?.previousSorting) {
        queryClient.setQueryData(
          queryKeys.views.structure.configuration.sorts(viewId),
          context.previousSorting,
        );
      }
      toast.error(err instanceof Error ? err.message : "Failed to update sort");
    },
  });

  return {
    initialSortState: initialSortState ?? [],
    updateSort: (sorting: SortingState) =>
      updateSortMutation.mutateAsync(sorting),
    isUpdating: updateSortMutation.isPending,
  };
}
