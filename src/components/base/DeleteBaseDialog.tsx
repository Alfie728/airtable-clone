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
import { deleteBase } from "~/lib/actions/bases.action";
import { toast } from "sonner";
import { useQueryClient, type Query } from "@tanstack/react-query";
import {
  queryKeys,
  getBaseRelatedQueryKeys,
  getTableRelatedQueryKeys,
} from "~/lib/query/keys";
import type { BaseResponse } from "~/types/table";
import type { tables } from "~/server/db/schema";

type TableType = typeof tables.$inferSelect;

interface DeleteBaseDialogProps {
  baseId: string;
  baseName: string;
  children: React.ReactNode;
}

export function DeleteBaseDialog({
  baseId,
  baseName,
  children,
}: DeleteBaseDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteBase(baseId);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Get all tables for this base before removing queries
      const baseTablesData = queryClient.getQueryData<{
        success: boolean;
        tables: TableType[];
      }>(queryKeys.bases.tables.list(baseId));

      const baseTables = baseTablesData?.success ? baseTablesData.tables : [];

      // Remove all base-related queries
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as Array<string>;

          // Check if this query is related to the deleted base
          return (
            // Check base-related queries
            getBaseRelatedQueryKeys(baseId).some((key) => {
              return key.every((value, index) => queryKey[index] === value);
            }) ||
            // Check table-related queries for all tables in this base
            baseTables.some((table) =>
              getTableRelatedQueryKeys(table.id).some((key) =>
                key.every((value, index) => queryKey[index] === value),
              ),
            )
          );
        },
      });

      // Invalidate the bases list to update the UI
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bases.list(),
      });

      toast.success("Base deleted successfully");
      setIsOpen(false);
      router.push("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete base",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Base</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{baseName}&quot;? This action
            cannot be undone and will permanently delete all tables, views, and
            data associated with this base.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
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
            {isDeleting ? "Deleting..." : "Delete Base"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
