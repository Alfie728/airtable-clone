"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Pencil,
  Trash2,
  Copy,
  ArrowLeftToLine,
  ArrowRightToLine,
  Link2,
  Info,
  Lock,
  ArrowDownAZ,
  ArrowDownZA,
  Filter,
  Group,
  EyeOff,
  MoreHorizontal,
  HelpCircle,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { useColumns } from "~/hooks/useColumns";
import type { Column } from "~/types/table";

interface ColumnManagementProps {
  tableId: string;
  column: Column;
  onColumnUpdated?: () => void;
  onSort?: (direction: "asc" | "desc" | false, isMulti: boolean) => void;
  sortDirection?: "asc" | "desc" | null;
}

export function ColumnManagement({
  tableId,
  column,
  onColumnUpdated,
  onSort,
  sortDirection,
}: ColumnManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newColumnName, setNewColumnName] = useState(column.name);
  const [alignOffset, setAlignOffset] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { deleteColumn, renameColumn, isDeletingColumn, isRenamingColumn } =
    useColumns(tableId);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const headerCell = triggerRef.current.closest("th");
      if (headerCell) {
        const headerRect = headerCell.getBoundingClientRect();
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const offset = triggerRect.left - headerRect.left;
        setAlignOffset(-offset);
      }
    }
  }, [isOpen]);

  const handleDeleteColumn = async () => {
    try {
      setShowDeleteDialog(false);
      setIsOpen(false);
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
    try {
      await renameColumn({ columnId: column.id, newName: newColumnName });
      toast.success("Column renamed successfully");
      setIsRenaming(false);
      setIsOpen(false);
      onColumnUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename column",
      );
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setNewColumnName(column.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && (showDeleteDialog || isRenaming)) {
      return;
    }
    setIsOpen(open);
    if (!open) {
      setIsRenaming(false);
      setNewColumnName(column.name);
    }
  };
  console.log(isRenaming);
  return (
    <>
      <DropdownMenu modal={false} open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            aria-label="Column options"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          alignOffset={alignOffset}
          className={isRenaming ? "w-[400px] p-4" : "w-[220px]"}
          sideOffset={10}
          onCloseAutoFocus={(event) => {
            if (showDeleteDialog || isRenaming) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (showDeleteDialog || isRenaming) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (showDeleteDialog || isRenaming) {
              event.preventDefault();
            }
          }}
        >
          {isRenaming ? (
            <>
              <div className="mb-2 text-sm font-medium text-gray-700">
                What kind of data is in this field?
              </div>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Input
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-9 pr-8 text-sm"
                    placeholder="Field name"
                    autoFocus
                  />
                  <HelpCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="text-xs text-gray-500">
                  Examples:{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
                  >
                    Status
                  </Button>{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
                  >
                    Priority
                  </Button>{" "}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
                  >
                    Due date
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRenameCancel}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => void handleRenameSubmit()}
                    disabled={isRenamingColumn}
                    className="h-8 text-xs"
                  >
                    {isRenamingColumn ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sorting options */}
              {onSort && (
                <>
                  <DropdownMenuItem
                    onClick={() => onSort("asc", false)}
                    className="gap-2 text-xs"
                  >
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                    Sort A to Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onSort("desc", false)}
                    className="gap-2 text-xs"
                  >
                    <ArrowDownZA className="h-3.5 w-3.5" />
                    Sort Z to A
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Field options */}
              <DropdownMenuItem
                onClick={() => setIsRenaming(true)}
                className="gap-2 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename field
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-xs text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete field
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete field</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this field? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteColumn()}
              disabled={isDeletingColumn}
              className="h-8 text-xs"
            >
              {isDeletingColumn ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
