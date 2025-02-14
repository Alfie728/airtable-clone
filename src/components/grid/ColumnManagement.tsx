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
  Plus,
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
} from "lucide-react";
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
  const [alignOffset, setAlignOffset] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    addColumn,
    deleteColumn,
    renameColumn,
    isAddingColumn,
    isDeletingColumn,
    isRenamingColumn,
  } = useColumns(tableId);

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
    if (!column) return;
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
    setNewColumnName(column?.name ?? "");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && showDeleteDialog) {
      return;
    }
    setIsOpen(open);
    if (!open) {
      setIsRenaming(false);
      setNewColumnName(column?.name ?? "");
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
                    className="h-8 text-sm"
                    onClick={handleRenameCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-sm"
                    onClick={() => void handleRenameSubmit()}
                    disabled={isRenamingColumn}
                  >
                    {isRenamingColumn ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsRenaming(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit field
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate field
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowLeftToLine className="mr-2 h-4 w-4" />
                Insert left
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowRightToLine className="mr-2 h-4 w-4" />
                Insert right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link2 className="mr-2 h-4 w-4" />
                Copy field URL
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Info className="mr-2 h-4 w-4" />
                Edit field description
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Lock className="mr-2 h-4 w-4" />
                Edit field permissions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                Sort A → Z
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowDownZA className="mr-2 h-4 w-4" />
                Sort Z → A
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Filter className="mr-2 h-4 w-4" />
                Filter by this field
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Group className="mr-2 h-4 w-4" />
                Group by this field
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide field
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
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
              undone and all data in this field will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeletingColumn}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteColumn()}
              disabled={isDeletingColumn}
            >
              {isDeletingColumn ? "Deleting..." : "Delete field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
