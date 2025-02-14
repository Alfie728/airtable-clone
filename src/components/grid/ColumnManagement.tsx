"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useColumns } from "~/hooks/useColumns";
import type { Column } from "~/types/table";

interface ColumnManagementProps {
  tableId: string;
  column?: Column;
  onColumnUpdated?: () => void;
}

export function ColumnManagement({
  tableId,
  column,
  onColumnUpdated,
}: ColumnManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newColumnName, setNewColumnName] = useState(column?.name ?? "");
  const {
    addColumn,
    deleteColumn,
    renameColumn,
    isAddingColumn,
    isDeletingColumn,
    isRenamingColumn,
  } = useColumns(tableId);

  const handleAddColumn = async () => {
    try {
      await addColumn({ name: "New Column", type: "text" });
      toast.success("Column added successfully");
      onColumnUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add column",
      );
    }
  };

  const handleDeleteColumn = async () => {
    if (!column) return;
    try {
      await deleteColumn(column.id);
      toast.success("Column deleted successfully");
      onColumnUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete column",
      );
    }
  };

  const handleRenameSubmit = async () => {
    if (!column) return;
    try {
      await renameColumn({ columnId: column.id, newName: newColumnName });
      toast.success("Column renamed successfully");
      setIsRenaming(false);
      onColumnUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename column",
      );
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setNewColumnName(column?.name ?? "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  if (!column) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddColumn}
        disabled={isAddingColumn}
        className="h-7 gap-2 text-xs hover:bg-gray-50"
      >
        {isAddingColumn ? (
          "Adding..."
        ) : (
          <>
            <Plus className="h-3 w-3" />
            Add column
          </>
        )}
      </Button>
    );
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <Input
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm"
          placeholder="Column name"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRenameCancel}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleRenameSubmit()}
            disabled={isRenamingColumn}
            className="h-7 text-xs"
          >
            {isRenamingColumn ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <span className="sr-only">Open column menu</span>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem
          onClick={() => {
            setIsRenaming(true);
            setIsOpen(false);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Rename column
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleDeleteColumn()}
          disabled={isDeletingColumn}
          className="text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeletingColumn ? "Deleting..." : "Delete column"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
