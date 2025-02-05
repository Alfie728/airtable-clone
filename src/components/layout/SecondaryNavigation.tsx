"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
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
      <div className="flex flex-col border-b">
        {/* Table tabs */}
        <div className="flex items-center gap-2 px-4">
          <div className="flex flex-1 items-center">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => onTableSelect?.(table.id)}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900",
                  "focus:outline-none",
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
                  currentTableId === table.id
                    ? "text-green-600 after:bg-green-600"
                    : "after:bg-transparent",
                )}
              >
                {table.name}
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setIsCreateTableOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="gap-2">
              Add or import
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost">Extensions</Button>
            <Button variant="ghost" className="gap-2">
              Tools
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isCreateTableOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new table</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTable} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="tableName"
                className="text-sm font-medium text-gray-700"
              >
                Table name
              </label>
              <Input
                id="tableName"
                value={tableName}
                onChange={(e) => {
                  setTableName(e.target.value);
                  setError("");
                }}
                placeholder="Enter table name"
                className={cn("w-full", error && "border-red-500")}
                aria-invalid={!!error}
                aria-errormessage={error ? "tableName-error" : undefined}
              />
              {error && (
                <p id="tableName-error" className="text-sm text-red-500">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !tableName.trim()}>
                {isCreating ? "Creating..." : "Create table"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
