import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createView, getTableViews } from "~/lib/actions/views.action";
import { queryKeys, getViewRelatedQueryKeys } from "~/lib/query/keys";
import type { views } from "~/server/db/schema";
import { toast } from "sonner";

export function useViews(tableId: string) {
  const queryClient = useQueryClient();

  // Query for fetching views
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.views.list(tableId),
    queryFn: async () => {
      const result = await getTableViews(tableId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to get views");
      }
      return result.views;
    },
    staleTime: 5 * 1000,
  });

  // Mutation for creating views
  const { mutateAsync: createViewMutation, isPending: isCreatingView } =
    useMutation({
      mutationFn: async ({ name }: { name: string }) => {
        const result = await createView(tableId, name);
        if (!result.success || !result.view) {
          throw new Error(result.error ?? "Failed to create view");
        }
        return result.view;
      },
      onSuccess: (newView) => {
        // Update views list cache
        queryClient.setQueryData<(typeof views.$inferSelect)[]>(
          queryKeys.views.list(tableId),
          (oldViews) => [...(oldViews ?? []), newView],
        );

        // Invalidate all view-related queries
        void queryClient.invalidateQueries({
          queryKey: getViewRelatedQueryKeys(newView.id),
        });

        toast.success("View created successfully");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to create view",
        );
      },
    });

  const createNewView = async (type: "grid") => {
    try {
      // Generate a unique name for the view
      const viewNumber = (data?.length ?? 0) + 1;
      const viewName = `Grid View ${viewNumber}`;

      return await createViewMutation({ name: viewName });
    } catch (error) {
      console.error("Error creating view:", error);
      throw error;
    }
  };

  return {
    views: data as (typeof views.$inferSelect)[] | undefined,
    isLoading,
    error: error instanceof Error ? error : null,
    createView: createNewView,
    isCreatingView,
  };
}
