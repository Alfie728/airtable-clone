"use client";

import { useState } from "react";
import { ChevronDown, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { createTable } from "~/lib/actions/tables.action";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

interface SecondaryNavigationProps {
  currentTableName?: string;
  tables?: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  onTableSelect?: (tableId: string) => void;
  onTableCreated?: (table: typeof tables.$inferSelect) => void;
}

export function SecondaryNavigation({
  tables = [],
  currentTableId,
  currentTableName,
  onTableSelect,
  onTableCreated,
}: SecondaryNavigationProps) {
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const params = useParams();

  function validateTableName(name: string) {
    if (!name.trim()) {
      return "Table name is required";
    }
    if (tables.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return "A table with this name already exists";
    }
    return "";
  }

  async function handleCreateTable(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateTableName(tableName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const baseId = params.baseId as string;
      const result = await createTable(baseId, tableName);
      if (result.success && result.table) {
        toast.success("Table created successfully");
        setTableName("");
        setIsCreateTableOpen(false);
        // Optimistically update the UI
        onTableCreated?.(result.table);
      } else {
        setError(result.error ?? "Failed to create table");
        toast.error(result.error);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create table";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsCreateTableOpen(open);
    if (!open) {
      setTableName("");
      setError("");
    }
  }

  return (
    <>
      <div className="flex h-10 items-center gap-2 border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded px-2 text-sm font-medium hover:bg-gray-100"
            >
              Table 1
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded px-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setIsCreateTableOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add or import
            </Button>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded px-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Extensions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded px-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Tools
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isCreateTableOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new table</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTable}>
            <div className="space-y-4">
              <div>
                <Input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Table name"
                  className="mt-2"
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
