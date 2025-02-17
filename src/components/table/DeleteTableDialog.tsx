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

      // Actually perform the server action BEFORE navigation
      console.log("[UI] Calling server action");
      const result = await deleteTableAction(baseId, tableId);
      console.log("[UI] Server action result:", result);

      if (!result.success) {
        // Rollback on error
        console.error("[UI] Server action failed:", result.error);
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

      // Remove invalidateQueries since we've already updated the cache optimistically
      // and the server action was successful

      // Navigate AFTER server action completes successfully
      const remainingTables = previousTablesData?.success
        ? previousTablesData.tables.filter((t) => t.id !== tableId)
        : [];

      const firstTable = remainingTables[0];
      if (firstTable) {
        console.log("[UI] Navigating to first remaining table:", firstTable);
        // Check for cached view first
        const cachedView = queryClient.getQueryData<string>(
          queryKeys.tables.views.detail(firstTable.id, "default"),
        );

        if (cachedView) {
          router.push(`/${baseId}/${firstTable.id}/${cachedView}`, {
            scroll: false,
          });
        } else {
          // If no cached view, use loading state
          router.push(`/${baseId}/${firstTable.id}/loading`, {
            scroll: false,
          });
        }
      } else {
        console.log("[UI] No tables remaining, navigating to home");
        router.push("/", {
          scroll: false,
        });
      }

      toast.success("Table deleted successfully");
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
