"use client";

import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Search,
  Check,
  MoreHorizontal,
  Import,
  Pencil,
  Eye,
  Settings2,
  Copy,
  CalendarClock,
  Info,
  Lock,
  XCircle,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { Separator } from "@radix-ui/react-separator";
import type { TableCreateResponse, TableRenameResponse } from "~/types/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EditableTableName } from "../table/EditableTableName";

interface SecondaryNavigationProps {
  currentTableName?: string;
  tables?: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  onTableSelect?: (tableId: string) => void;
  onTableCreated?: (table: typeof tables.$inferSelect) => void;
  addTable: (tableName: string) => Promise<TableCreateResponse>;
  isAddingTable: boolean;
  pendingActiveTableId: string | null;
  renameTable?: (newName: string) => Promise<TableRenameResponse>;
  isRenaming?: boolean;
}

export function SecondaryNavigation({
  tables = [],
  currentTableId,
  currentTableName,
  onTableSelect,
  onTableCreated,
  addTable,
  isAddingTable,
  pendingActiveTableId,
  renameTable,
  isRenaming,
}: SecondaryNavigationProps) {
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [error, setError] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editedTableName, setEditedTableName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const params = useParams();
  const baseId = params.baseId as string;

  const handleRenameTable = async (tableId: string) => {
    setEditingTableId(tableId);
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setEditedTableName(table.name);
    }
  };

  const handleRenameSubmit = async () => {
    if (!editingTableId || !renameTable) return;

    // Close dropdown immediately for better UX
    setEditingTableId(null);
    setIsDropdownOpen(false);

    try {
      const result = await renameTable(editedTableName);
      if (result.success) {
        toast.success("Table renamed successfully");
      } else {
        toast.error(result.error ?? "Failed to rename table");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename table",
      );
    }
  };

  const handleRenameCancel = () => {
    setEditingTableId(null);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

    const nameToCreate = tableName;
    // Close dialog and reset state immediately
    setIsCreateTableOpen(false);
    setTableName("");
    setError("");

    // Show loading toast
    const loadingToast = toast.loading("Creating table...");

    try {
      const result = await addTable(nameToCreate);
      if (result?.success && result?.table) {
        toast.success("Table created successfully", {
          id: loadingToast,
        });

        // Optimistically update the UI
        onTableCreated?.(result.table);
      } else {
        const errorMessage = result?.error ?? "Failed to create table";
        toast.error(errorMessage, {
          id: loadingToast,
        });
        // Reopen dialog with previous input on error
        setIsCreateTableOpen(true);
        setTableName(nameToCreate);
        setError(errorMessage);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create table";
      toast.error(message, {
        id: loadingToast,
      });
      // Reopen dialog with previous input on error
      setIsCreateTableOpen(true);
      setTableName(nameToCreate);
      setError(message);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsCreateTableOpen(open);
    if (!open) {
      setTableName("");
      setError("");
    }
  }
  console.log(editingTableId);
  return (
    <>
      <div className="flex h-8 items-center overflow-hidden border-gray-200 bg-[#575C65] px-2">
        <div className="relative flex items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              {tables.map((table, index) => {
                const isActive = isAddingTable
                  ? isAddingTable && index === tables.length - 1
                  : table.id === pendingActiveTableId ||
                    (!pendingActiveTableId && currentTableId === table.id);

                return (
                  <Button
                    key={table.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative gap-1 rounded-none rounded-t-[3px] px-3 text-[13px] font-normal leading-[18px]",
                      isActive
                        ? "bg-white hover:bg-white"
                        : "bg-[#575C65] text-[rgba(255,255,255,0.85)] hover:bg-[#4E535B] hover:text-[rgba(255,255,255,0.95)]",
                    )}
                    onClick={() => {
                      onTableSelect?.(table.id);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "truncate",
                          isActive
                            ? "text-black"
                            : "text-[rgba(255,255,255,0.85)]",
                        )}
                      >
                        {table.name}
                      </span>
                      {isActive ? (
                        editingTableId ? (
                          <DropdownMenu
                            open={isDropdownOpen}
                            onOpenChange={setIsDropdownOpen}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[400px] p-4">
                              <div className="mb-2 text-sm font-medium text-gray-700">
                                What should each record be called?
                              </div>
                              <div className="flex flex-col gap-3">
                                <div className="relative">
                                  <Input
                                    value={editedTableName}
                                    onChange={(e) =>
                                      setEditedTableName(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    className="h-9 pr-8 text-sm"
                                    placeholder="Record"
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
                                    Add record
                                  </Button>{" "}
                                  <Button
                                    variant="link"
                                    className="h-auto p-0 text-xs font-normal text-gray-500 hover:text-gray-700"
                                  >
                                    Send records
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
                                    disabled={isRenaming}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <DropdownMenu
                            open={isDropdownOpen}
                            onOpenChange={setIsDropdownOpen}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[220px]"
                            >
                              <DropdownMenuItem>
                                <Import className="mr-2 h-4 w-4" />
                                Import data
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setIsDropdownOpen(true);
                                  void handleRenameTable(table.id);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename table
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Hide table
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings2 className="mr-2 h-4 w-4" />
                                Manage fields
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate table
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Configure date dependencies
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Info className="mr-2 h-4 w-4" />
                                Edit table description
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Lock className="mr-2 h-4 w-4" />
                                Edit table permissions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear data
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete table
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      ) : null}
                    </div>
                  </Button>
                );
              })}
            </div>
            <div className="relative">
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-none bg-[#575C65] px-3 text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[456px] px-4 py-2"
                  sideOffset={0}
                >
                  <div className="flex flex-col">
                    <div className="border-b border-gray-200 p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          placeholder="Find a table"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 w-full border-0 pl-8 text-sm shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto py-2">
                      {filteredTables.map((table) => (
                        <div
                          key={table.id}
                          className="group flex items-center px-1 hover:bg-gray-100"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex h-9 flex-1 items-center justify-between gap-2 rounded-none px-2 py-1.5 text-[13px] font-normal hover:bg-transparent"
                            onClick={() => {
                              onTableSelect?.(table.id);
                              setIsPopoverOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {currentTableId === table.id && (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span
                                className={cn(
                                  "truncate",
                                  currentTableId === table.id
                                    ? "text-black"
                                    : "text-[rgba(255,255,255,0.85)]",
                                )}
                              >
                                {table.name}
                              </span>
                            </div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-sm p-0 opacity-0 hover:bg-gray-200 group-hover:opacity-100"
                            onClick={() => handleRenameTable(table.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Separator className="mt-2 h-px w-full bg-gray-200" />
                      <div className="px-1 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex h-9 w-full items-center justify-start gap-2 rounded-none px-2 py-1.5 text-[13px] font-normal hover:bg-gray-100"
                          onClick={() => {
                            setIsCreateTableOpen(true);
                            setIsPopoverOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add table
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Separator
              orientation="vertical"
              className="h-[12px] w-px bg-[#ffffff26]"
            />
            <Button
              variant="ghost"
              size="sm"
              className="relative gap-1 rounded-none rounded-t-[3px] bg-[#575C65] px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
              onClick={() => setIsCreateTableOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add or import
            </Button>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-md bg-[#575C65] px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          >
            Extensions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-md bg-[#575C65] px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          >
            Tools
            <ChevronDown className="h-3.5 w-3.5" />
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
                <Button type="submit" disabled={isAddingTable}>
                  Create
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What should each record be called?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                value={editedTableName}
                onChange={(e) => setEditedTableName(e.target.value)}
                className="pr-12"
              />
              <HelpCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="text-sm text-gray-500">
              Examples:{" "}
              <Button variant="link" className="h-auto p-0 text-sm font-normal">
                Add record
              </Button>{" "}
              <Button variant="link" className="h-auto p-0 text-sm font-normal">
                Send records
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleRenameSubmit}
              disabled={isRenaming}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </>
  );
}
