"use client";

import { useState } from "react";
import { ChevronDown, Plus, Search, Check, MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { TableCreateResponse } from "~/types/table";

interface SecondaryNavigationProps {
  currentTableName?: string;
  tables?: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  onTableSelect?: (tableId: string) => void;
  onTableCreated?: (table: typeof tables.$inferSelect) => void;
  addTable: (tableName: string) => Promise<TableCreateResponse>;
  isAddingTable: boolean;
  pendingActiveTableId: string | null;
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
}: SecondaryNavigationProps) {
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [error, setError] = useState("");
  const params = useParams();
  const baseId = params.baseId as string;

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
                    {table.name}
                    {isActive && <ChevronDown className="h-3.5 w-3.5" />}
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
                              <span>{table.name}</span>
                            </div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-sm p-0 opacity-0 hover:bg-gray-200 group-hover:opacity-100"
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
    </>
  );
}
