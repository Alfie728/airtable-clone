import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { updateViewFilter, getViewFilters } from "~/lib/actions/filter.action";
import type { FilterPreference } from "~/types/filter";
import { queryKeys } from "~/lib/query/keys";
import { toast } from "sonner";

export type FilterState = FilterPreference[];

interface TableFilterContext {
  previousFiltering?: FilterState;
}

export function useTableFilter(viewId: string) {
  const queryClient = useQueryClient();

  // Query for initial filter state
  const { data: initialFilterState } = useQuery<FilterState>({
    queryKey: queryKeys.views.customizations.filters(viewId),
    queryFn: async () => {
      const result = await getViewFilters(viewId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to get view filters");
      }
      return (result.filters ?? []).map((filter) => ({
        id: filter.id,
        columnId: filter.columnId,
        operator: filter.operator,
        value: filter.value ?? "",
        order: filter.order,
      }));
    },
    staleTime: 30000, // Add staleTime to prevent frequent refetches
  });

  // Mutation for updating filter state
  const updateFilterMutation = useMutation<
    { success: boolean },
    Error,
    FilterState,
    TableFilterContext
  >({
    mutationFn: async (filtering) => {
      console.log("Updating filters:", filtering);
      // If filtering array is empty, we're removing all filters
      if (filtering.length === 0) {
        console.log("Removing all filters");
        const result = await updateViewFilter(viewId, []);
        if (!result.success) {
          throw new Error(result.error ?? "Failed to remove filters");
        }
        return { success: true };
      }

      // Validate filter values before sending to server
      const validFilters = filtering.filter((filter) => {
        // Skip empty value filters unless they are is_empty/is_not_empty operators
        if (
          !filter.value &&
          !["is_empty", "is_not_empty"].includes(filter.operator)
        ) {
          return false;
        }
        return true;
      });

      console.log("Applying valid filters:", validFilters);
      const result = await updateViewFilter(viewId, validFilters);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update filter");
      }
      return { success: true };
    },
    onMutate: async (newFiltering) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.views.customizations.filters(viewId),
      });

      const previousFiltering = queryClient.getQueryData<FilterState>(
        queryKeys.views.customizations.filters(viewId),
      );

      // Update the cache optimistically
      queryClient.setQueryData<FilterState>(
        queryKeys.views.customizations.filters(viewId),
        newFiltering,
      );

      return { previousFiltering };
    },
    onError: (err, newFiltering, context) => {
      if (context?.previousFiltering) {
        queryClient.setQueryData(
          queryKeys.views.customizations.filters(viewId),
          context.previousFiltering,
        );
      }
      toast.error(err.message ?? "Failed to update filter");
    },
  });

  return {
    initialFilterState: initialFilterState ?? [],
    updateFilter: (filtering: FilterState) => {
      console.log("useTableFilter hook: updateFilter");
      return updateFilterMutation.mutateAsync(filtering);
    },
    isUpdating: updateFilterMutation.isPending,
  };
}
