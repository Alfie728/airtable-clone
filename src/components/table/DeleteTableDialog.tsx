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
import { useTable } from "~/hooks/useTable";

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
  const { deleteTable, isDeleting } = useTable(baseId, tableId);

  const handleDelete = async () => {
    try {
      console.log("Starting client-side delete process...");
      setIsOpen(false);
      const result = await deleteTable();
      console.log("Delete table result:", result);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Get all tables for this base
      const baseTablesData = queryClient.getQueryData<{
        success: boolean;
        tables: Array<{
          id: string;
          name: string;
          baseId: string;
        }>;
      }>(queryKeys.bases.tables.list(baseId));

      console.log("Remaining tables:", baseTablesData);

      const remainingTables = baseTablesData?.success
        ? baseTablesData.tables.filter((t) => t.id !== tableId)
        : [];

      // If there are remaining tables, navigate to the first one
      const firstTable = remainingTables[0];
      if (firstTable) {
        console.log("Navigating to first remaining table:", firstTable);
        router.replace(`/${baseId}/${firstTable.id}/grid`);
      } else {
        console.log("No tables remaining, navigating to home");
        router.replace("/");
      }

      toast.success("Table deleted successfully", {
        duration: 5000, // Show for 5 seconds
      });
    } catch (error) {
      console.error("Error in handleDelete:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete table",
        {
          duration: 5000, // Show for 5 seconds
        },
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
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
