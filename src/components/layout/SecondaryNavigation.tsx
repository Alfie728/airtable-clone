"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useParams } from "next/navigation";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { Separator } from "@radix-ui/react-separator";
import type { TableCreateResponse, TableRenameResponse } from "~/types/table";
import { TableListDropdown } from "../table/TableListDropdown";
import { TableOptionsDropdown } from "../table/TableOptionsDropdown";
import { CreateTableDropdown } from "../table/CreateTableDropdown";

interface SecondaryNavigationProps {
  tables?: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  currentTableName?: string;
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

  const validateTableName = (name: string): string => {
    if (tables.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return "A table with this name already exists";
    }
    return "";
  };

  const handleCreateTable = async () => {
    const validationError = validateTableName(tableName);
    if (validationError) {
      setError(validationError);
      console.log(validationError);
      return;
    }

    const nameToCreate = tableName || `Table ${tables.length + 1}`;
    setTableName("");
    setError("");
    setIsCreateTableOpen(false);

    const loadingToast = toast.loading("Creating table...");

    try {
      const result = await addTable(nameToCreate);
      if (result?.success && result?.table) {
        toast.success("Table created successfully", {
          id: loadingToast,
        });
        onTableCreated?.(result.table);
      } else {
        const errorMessage = result?.error ?? "Failed to create table";
        toast.error(errorMessage, {
          id: loadingToast,
        });
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
      setIsCreateTableOpen(true);
      setTableName(nameToCreate);
      setError(message);
    }
  };

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
                      {isActive && (
                        <TableOptionsDropdown
                          isOpen={isDropdownOpen}
                          onOpenChange={setIsDropdownOpen}
                          onRename={() => handleRenameTable(table.id)}
                          isRenaming={editingTableId === table.id}
                          editedTableName={editedTableName}
                          onEditedTableNameChange={setEditedTableName}
                          onRenameSubmit={handleRenameSubmit}
                          onRenameCancel={handleRenameCancel}
                          onKeyDown={handleKeyDown}
                        />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
            <TableListDropdown
              tables={tables}
              currentTableId={currentTableId}
              onTableSelect={(tableId) => {
                onTableSelect?.(tableId);
              }}
              onCreateTableClick={() => setIsCreateTableOpen(true)}
              onTableOptionsClick={handleRenameTable}
            />
            <Separator
              orientation="vertical"
              className="h-[12px] w-px bg-[#ffffff26]"
            />
            <CreateTableDropdown
              isOpen={isCreateTableOpen}
              onOpenChange={setIsCreateTableOpen}
              onCreateTable={handleCreateTable}
              tablesCount={tables.length}
            />
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
    </>
  );
}
