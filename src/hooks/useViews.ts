import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createView,
  deleteView,
  renameView,
  getTableViews,
} from "~/lib/actions/views.action";
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

  // Mutation for deleting views
  const { mutateAsync: deleteViewMutation, isPending: isDeletingView } =
    useMutation({
      mutationFn: async (viewId: string) => {
        const result = await deleteView(viewId);
        if (!result.success) {
          throw new Error(result.error ?? "Failed to delete view");
        }
        return viewId;
      },
      onSuccess: (viewId) => {
        // Update views list cache by removing the deleted view
        queryClient.setQueryData<(typeof views.$inferSelect)[]>(
          queryKeys.views.list(tableId),
          (oldViews) => oldViews?.filter((view) => view.id !== viewId) ?? [],
        );

        // Invalidate related queries
        void queryClient.invalidateQueries({
          queryKey: getViewRelatedQueryKeys(viewId),
        });

        toast.success("View deleted successfully");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete view",
        );
      },
    });

  // Mutation for renaming views
  const { mutateAsync: renameViewMutation, isPending: isRenamingView } =
    useMutation({
      mutationFn: async ({
        viewId,
        name,
      }: {
        viewId: string;
        name: string;
      }) => {
        const result = await renameView(viewId, name);
        if (!result.success || !result.view) {
          throw new Error(result.error ?? "Failed to rename view");
        }
        return result.view;
      },
      onSuccess: (updatedView) => {
        // Update views list cache with renamed view
        queryClient.setQueryData<(typeof views.$inferSelect)[]>(
          queryKeys.views.list(tableId),
          (oldViews) =>
            oldViews?.map((view) =>
              view.id === updatedView.id ? updatedView : view,
            ) ?? [],
        );

        toast.success("View renamed successfully");
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to rename view",
        );
      },
    });

  return {
    views: data as (typeof views.$inferSelect)[] | undefined,
    isLoading,
    error: error instanceof Error ? error : null,
    createView: createNewView,
    isCreatingView,
    deleteView: deleteViewMutation,
    isDeletingView,
    renameView: renameViewMutation,
    isRenamingView,
  };
}
