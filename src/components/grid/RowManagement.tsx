"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Trash2,
  Copy,
  GripVertical,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "sonner";
import { useRows } from "~/hooks/useRows";
import type { Row } from "~/types/table";
import { cn } from "~/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface RowManagementProps {
  tableId: string;
  row: Row;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onRowDeleted: (rowId: string) => void;
  dragHandleProps?: {
    listeners?: {
      onKeyDown?: (event: React.KeyboardEvent) => void;
      onMouseDown?: (event: React.MouseEvent) => void;
      onTouchStart?: (event: React.TouchEvent) => void;
    };
    attributes?: {
      role?: string;
      "aria-roledescription"?: string;
      tabIndex?: number;
      "data-index"?: number;
    };
  };
  isDragging?: boolean;
}

export function RowManagement({
  tableId,
  row,
  isSelected,
  onSelectionChange,
  onRowDeleted,
  dragHandleProps,
}: RowManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { deleteRow, isDeletingRow } = useRows(tableId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative" as const,
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  // Get the row number from the data-index attribute
  const rowNumber =
    typeof dragHandleProps?.attributes?.["data-index"] === "number"
      ? dragHandleProps.attributes["data-index"] + 1
      : 1;

  const handleDeleteRow = async () => {
    try {
      // Close UI elements immediately
      setShowDeleteDialog(false);
      setIsOpen(false);

      // Update local state immediately
      onRowDeleted(row.id);

      // Call the delete mutation
      const result = await deleteRow(row.id);

      if (result.success) {
        toast.success("Row deleted successfully");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete row",
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && showDeleteDialog) {
      return;
    }
    setIsOpen(open);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "shadow-xl ring-1 ring-gray-200")}
    >
      <div className="group/row flex h-[34px] items-center gap-1 px-2">
        <div className="flex items-center">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "invisible flex h-6 w-6 items-center justify-center group-hover/row:visible",
              isDragging ? "visible cursor-grabbing" : "cursor-grab",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 text-gray-400" />
          </button>
          <div className="relative flex w-full items-center justify-center">
            <span
              className={cn(
                "pointer-events-none text-xs text-gray-400 transition-opacity",
                isSelected ? "opacity-0" : "group-hover/row:opacity-0",
              )}
            >
              {rowNumber}
            </span>
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className={cn(
                "absolute h-3.5 w-3.5 rounded-[4px] border-gray-300 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover/row:opacity-100",
              )}
              aria-label="Select row"
            />
          </div>
        </div>
        <DropdownMenu
          modal={false}
          open={isOpen}
          onOpenChange={handleOpenChange}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent"
              aria-label="Row options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[180px]"
            onCloseAutoFocus={(event) => {
              if (showDeleteDialog) {
                event.preventDefault();
              }
            }}
            onEscapeKeyDown={(event) => {
              if (showDeleteDialog) {
                event.preventDefault();
              }
            }}
            onInteractOutside={(event) => {
              if (showDeleteDialog) {
                event.preventDefault();
              }
            }}
          >
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate row
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Move to...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowDeleteDialog(true);
              }}
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete row
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row? This action cannot be
              undone and all data in this row will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingRow}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteRow()}
              disabled={isDeletingRow}
            >
              {isDeletingRow ? "Deleting..." : "Delete row"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
