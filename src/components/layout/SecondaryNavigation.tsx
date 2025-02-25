"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useParams } from "next/navigation";
import type { tables } from "~/server/db/schema";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { Separator } from "@radix-ui/react-separator";
import type {
  TableCreateResponse,
  TableRenameResponse,
  SerializedTable,
} from "~/types/table";
import { TableListDropdown } from "../table/TableListDropdown";
import { TableOptionsDropdown } from "../table/TableOptionsDropdown";
import { CreateTableDropdown } from "../table/CreateTableDropdown";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchTable } from "~/lib/query/prefetch";
import { table } from "console";

interface SecondaryNavigationProps {
  tables?: Array<typeof tables.$inferSelect>;
  currentTableId?: string | null;
  currentTableName?: string;
  onTableSelect?: (tableId: string) => void;
  onTableCreated?: (
    table: typeof tables.$inferSelect & { defaultViewId?: string },
  ) => void;
  addTableAction: (tableName: string) => Promise<TableCreateResponse>;
  isAddingTable: boolean;
  pendingActiveTableId: string | null;
  pendingActiveViewId?: string | null;
  setPendingActiveViewId?: (viewId: string | null) => void;
  renameTable?: (newName: string) => Promise<TableRenameResponse>;
  isRenaming?: boolean;
}

export function SecondaryNavigation({
  tables = [],
  currentTableId,
  currentTableName,
  onTableSelect,
  onTableCreated,
  addTableAction,
  isAddingTable,
  pendingActiveTableId,
  pendingActiveViewId,
  setPendingActiveViewId,
  renameTable,
  isRenaming,
}: SecondaryNavigationProps) {
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableName, setTableName] = useState("");
  const [error, setError] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editedTableName, setEditedTableName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lastUsedNumber, setLastUsedNumber] = useState(tables.length);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  const handleHover = useCallback(
    (tableId: string, tableName: string) => {
      if (tableId === currentTableId) return;

      void prefetchTable(queryClient, tableId, tableName);

      const currentIndex = tables.findIndex((t) => t.id === tableId);
      if (currentIndex !== -1) {
        const prevTable = tables[currentIndex - 1];
        const nextTable = tables[currentIndex + 1];

        if (prevTable && prevTable.id !== currentTableId) {
          void prefetchTable(queryClient, prevTable.id, prevTable.name);
        }
        if (nextTable && nextTable.id !== currentTableId) {
          void prefetchTable(queryClient, nextTable.id, nextTable.name);
        }
      }
    },
    [queryClient, tables, currentTableId],
  );

  const handleRenameTable = async (tableId: string) => {
    setEditingTableId(tableId);
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setEditedTableName(table.name);
    }
  };

  const handleRenameSubmit = async () => {
    if (!editingTableId || !renameTable) return;

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

  const handleCreateTable = async () => {
    let nextNumber = lastUsedNumber + 1;
    let nameToCreate = `Table ${nextNumber}`;

    while (tables.some((t) => t.name === nameToCreate)) {
      nextNumber++;
      nameToCreate = `Table ${nextNumber}`;
    }

    setTableName("");
    setError("");
    setIsCreateTableOpen(false);

    const loadingToast = toast.loading("Creating table...");

    try {
      const result = await addTableAction(nameToCreate);
      if (result?.success && result?.table) {
        setLastUsedNumber(nextNumber);
        toast.success("Table created successfully", {
          id: loadingToast,
        });
        if (result.defaultViewId && setPendingActiveViewId) {
          setPendingActiveViewId(result.defaultViewId);
        }
        onTableCreated?.({
          ...result.table,
          createdAt: new Date(result.table.createdAt),
          updatedAt: result.table.updatedAt
            ? new Date(result.table.updatedAt)
            : null,
          defaultViewId: result.defaultViewId,
        });
      } else {
        const errorMessage =
          !result?.success && "error" in result
            ? result.error
            : "Failed to create table";
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
      <div className="flex h-8 items-center overflow-hidden border-gray-200 bg-[#616670]">
        <div
          className="relative flex flex-1 items-center bg-[#575C65] pl-2"
          style={{ borderTopRightRadius: "6px" }}
        >
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
                    ref={isActive ? activeTabRef : undefined}
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
                    onMouseEnter={() => handleHover(table.id, table.name)}
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
                          tableName={table.name}
                          tableId={table.id}
                          tabRef={activeTabRef}
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
        <div className="h-full w-[8px]" />
        <div
          className="flex w-[165.58px] items-center bg-[#575C65]"
          style={{ borderTopLeftRadius: "6px" }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          >
            Extensions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-3 text-[13px] font-normal leading-[18px] text-[rgba(255,255,255,0.85)] hover:text-[rgba(255,255,255,0.95)]"
          >
            Tools
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
