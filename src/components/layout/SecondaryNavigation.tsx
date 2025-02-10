"use client";

import { useState } from "react";
import { ChevronDown, Plus, Search, Check, MoreHorizontal } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { Separator } from "@radix-ui/react-separator";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const params = useParams();

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
      <div className="flex h-8 items-center overflow-hidden border-gray-200 bg-[#575C65] px-2">
        <div className="relative flex items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative gap-1 rounded-none rounded-t-[3px] bg-white px-3 text-[13px] font-normal leading-[18px] hover:bg-[#4E535B]",
                    currentTableId === table.id && "bg-white hover:bg-white",
                    currentTableId !== table.id &&
                      "bg-[#575C65] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]",
                  )}
                  onClick={() => onTableSelect?.(table.id)}
                >
                  {table.name}
                  {currentTableId === table.id && (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Popover>
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
