"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import { deleteTableAction } from "~/lib/actions/tables.action";
import { getDefaultView } from "~/lib/actions/views.action";

interface DeleteTableDialogProps {
  baseId: string;
  tableId: string;
  tableName: string;
  children: React.ReactNode;
}

export function DeleteTableDialog({
  baseId,
  tableId,
  tableName,
  children,
}: DeleteTableDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      console.log("[UI] Delete process started", {
        baseId,
        tableId,
        tableName,
      });
      setIsOpen(false);

      // Store previous state for rollback
      const previousTablesData = queryClient.getQueryData<{
        success: boolean;
        tables: Array<{
          id: string;
          name: string;
          baseId: string;
        }>;
      }>(queryKeys.bases.tables.list(baseId));

      const previousTableData = queryClient.getQueryData(
        queryKeys.tables.detail(tableId),
      );

      // Optimistically update the cache
      if (previousTablesData?.success) {
        queryClient.setQueryData(queryKeys.bases.tables.list(baseId), {
          ...previousTablesData,
          tables: previousTablesData.tables.filter((t) => t.id !== tableId),
        });
      }

      // Remove the table's data from cache optimistically
      queryClient.removeQueries({
        queryKey: queryKeys.tables.detail(tableId),
      });

      // Remove all view-related queries for this table to prevent foreign key errors
      queryClient.removeQueries({
        queryKey: queryKeys.views.list(tableId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.views.default(tableId),
      });
      // Also remove any view data queries
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return (
            queryKey[0] === "views" &&
            queryKey[1] === "data" &&
            queryKey[2] === tableId
          );
        },
      });

      // Actually perform the server action BEFORE navigation
      console.log("[UI] Calling server action");
      const result = await deleteTableAction(baseId, tableId);
      console.log("[UI] Server action result:", result);

      if (!result.success) {
        // Rollback on error
        console.log("[UI] Server action failed:", result.error);
        if (previousTablesData) {
          queryClient.setQueryData(
            queryKeys.bases.tables.list(baseId),
            previousTablesData,
          );
        }
        if (previousTableData) {
          queryClient.setQueryData(
            queryKeys.tables.detail(tableId),
            previousTableData,
          );
        }
        throw new Error(result.error ?? "Unknown error");
      }

      // Get remaining tables after successful deletion
      const remainingTables = previousTablesData?.success
        ? previousTablesData.tables.filter((t) => t.id !== tableId)
        : [];

      // Show success message
      toast.success("Table deleted successfully");

      // Navigate based on remaining tables
      if (remainingTables.length === 0) {
        console.log("[UI] No tables remaining, navigating to base list");
        router.replace("/");
      } else {
        const firstTable = remainingTables[0];
        if (!firstTable) {
          throw new Error("No table found for navigation");
        }

        console.log("[UI] Navigating to first remaining table:", firstTable);
        try {
          // Check if we already have a cached default view ID for the first table
          const cachedViewId = queryClient.getQueryData<string>(
            queryKeys.views.default(firstTable.id),
          );

          if (cachedViewId && typeof cachedViewId === "string") {
            console.log("[UI] Using cached default view ID:", cachedViewId);
            // Use replace instead of push to avoid history stack issues
            router.replace(`/${baseId}/${firstTable.id}/${cachedViewId}`);
            return;
          }

          // Get default view for the first table
          const result = await getDefaultView(firstTable.id);
          console.log("[UI] Default view response:", result);

          // Handle case where the table doesn't exist
          if (result.error?.includes("does not exist")) {
            console.log("[UI] Table not found, navigating to base page");
            router.replace(`/${baseId}`);
            return;
          }

          if (!result.viewId || typeof result.viewId !== "string") {
            throw new Error(
              result.error ?? "Failed to get default view or invalid view ID",
            );
          }

          // Ensure viewId is a string and log it for debugging
          const viewIdString = String(result.viewId);
          console.log(
            "[UI] Got valid viewId as string:",
            viewIdString,
            "type:",
            typeof viewIdString,
          );

          // Cache the default view ID to prevent future lookups
          queryClient.setQueryData(
            queryKeys.views.default(firstTable.id),
            viewIdString,
          );

          // Prefetch the table data to ensure smooth transition
          await queryClient.prefetchQuery({
            queryKey: queryKeys.tables.detail(firstTable.id),
          });

          console.log(
            "[UI] Navigating to:",
            `/${baseId}/${firstTable.id}/${viewIdString}`,
          );

          // Use replace instead of push to avoid history stack issues
          router.replace(`/${baseId}/${firstTable.id}/${viewIdString}`);
        } catch (navError) {
          console.error("[UI] Navigation error:", navError);
          // Fallback to base page if view navigation fails
          router.replace(`/${baseId}`);
        }
      }
    } catch (error) {
      console.error("[UI] Error in handleDelete:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        baseId,
        tableId,
      });

      toast.error(
        error instanceof Error ? error.message : "Failed to delete table",
      );
      setIsOpen(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete table</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the table &quot;{tableName}&quot;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
