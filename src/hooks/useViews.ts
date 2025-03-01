import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createView,
  deleteView,
  renameView,
  getTableViews,
  getDefaultView,
} from "~/lib/actions/views.action";
import { queryKeys, getViewRelatedQueryKeys } from "~/lib/query/keys";
import type { views } from "~/server/db/schema";
import { toast } from "sonner";
import { useEffect } from "react";

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
    // Add retry and error handling for table deletion scenarios
    retry: (failureCount, error) => {
      // Don't retry if the table might have been deleted
      if (
        error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("does not exist"))
      ) {
        return false;
      }
      // Otherwise retry a few times
      return failureCount < 2;
    },
  });

  // Add error handling for views
  useEffect(() => {
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (
        !errorMessage.includes("not found") &&
        !errorMessage.includes("does not exist")
      ) {
        toast.error(`Failed to load views: ${errorMessage}`);
      }
    }
  }, [error]);

  // Query for fetching default view ID
  const {
    data: defaultViewId,
    isLoading: isLoadingDefaultView,
    error: defaultViewError,
  } = useQuery({
    queryKey: queryKeys.views.default(tableId),
    queryFn: async () => {
      const result = await getDefaultView(tableId);
      if (!result.viewId || typeof result.viewId !== "string") {
        throw new Error(result.error ?? "Failed to get default view");
      }
      return result.viewId;
    },
    staleTime: 5 * 1000, // Cache for 5 seconds
    retry: (failureCount, error) => {
      // Don't retry if the table might have been deleted
      if (
        error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("does not exist"))
      ) {
        return false;
      }
      // Otherwise retry once
      return failureCount < 1;
    },
  });

  // Add error handling for default view
  useEffect(() => {
    if (defaultViewError instanceof Error) {
      const errorMessage = defaultViewError.message;
      if (
        !errorMessage.includes("not found") &&
        !errorMessage.includes("does not exist")
      ) {
        toast.error(`Failed to load default view: ${errorMessage}`);
      } else {
        // If the table doesn't exist, we should handle it gracefully
        console.log("[UI] Table or view does not exist:", errorMessage);
        // Consider navigating to a fallback route if needed
      }
    }
  }, [defaultViewError]);

  // Function to get default view ID with proper error handling
  const getDefaultViewId = async () => {
    try {
      // Try to get from cache first
      const cachedId = queryClient.getQueryData<string>(
        queryKeys.views.default(tableId),
      );
      if (typeof cachedId === "string") return { viewId: cachedId };

      // If not in cache, fetch it
      const result = await getDefaultView(tableId);

      // Log the result for debugging
      console.log("getDefaultViewId result:", result);

      if (!result.viewId) {
        // Check if the error indicates the table doesn't exist
        if (result.error?.includes("does not exist")) {
          console.log("[UI] Table does not exist:", result.error);
          // Return a specific error for table not found
          return { error: "TABLE_NOT_FOUND" };
        }
        throw new Error(result.error ?? "Failed to get default view");
      }

      // Ensure viewId is a string
      const viewIdString = String(result.viewId);

      // Cache the result
      queryClient.setQueryData(queryKeys.views.default(tableId), viewIdString);
      return { viewId: viewIdString };
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to get default view";
      return { error };
    }
  };

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
    getDefaultViewId,
    defaultViewId,
    isLoadingDefaultView,
  };
}
