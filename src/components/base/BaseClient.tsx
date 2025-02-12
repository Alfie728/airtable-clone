"use client";

import { useState, useEffect } from "react";
import type { tables } from "~/server/db/schema";
import { BaseTopNavigation } from "~/components/layout/TopNavigation";
import { EnhancedDataGrid } from "~/components/grid/EnhancedDataGrid";
import { GridControls } from "~/components/grid/GridControls";
import { Sidebar } from "~/components/layout/Sidebar";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { useTable } from "~/hooks/useTable";
import { useBase } from "~/hooks/useBase";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BaseClientProps {
  baseId: string;
  tableId: string;
  viewId: string;
}

export function BaseClient({ baseId, tableId, viewId }: BaseClientProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const queryClient = useQueryClient();

  const { baseName, isLoading: isBaseNameLoading } = useBase(baseId);
  const {
    tableData,
    isLoading,
    isTableLoading,
    baseError,
    tableError,
    addRow,
    addBulkRows,
    updateCell,
    isAddingRow,
    isBatchAdding,
    isAddingTable,
    baseTables,
  } = useTable(baseId, tableId);

  // Handle invalid table ID
  useEffect(() => {
    if (!isLoading && baseTables && baseTables.length > 0) {
      const firstTable = baseTables[0];
      if (
        firstTable &&
        (tableId === "tables" || !baseTables.some((t) => t.id === tableId))
      ) {
        router.replace(`/${baseId}/${firstTable.id}/grid`, { scroll: false });
      }
    }
  }, [isLoading, baseTables, tableId, baseId, router]);

  const handleTableCreated = async (newTable: typeof tables.$inferSelect) => {
    try {
      // Invalidate the queries to ensure we have fresh data
      await queryClient.invalidateQueries({ queryKey: ["base", baseId] });
      await queryClient.invalidateQueries({ queryKey: ["table", newTable.id] });
      // Now redirect to the new table
      router.replace(`/${baseId}/${newTable.id}/grid`, { scroll: false });
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error handling table creation:", error);
      toast.error("Error creating table. Please try again.");
    }
  };

  const handleTableSelect = (tableId: string) => {
    router.replace(`/${baseId}/${tableId}/grid`, { scroll: false });
  };
  console.log("isTableLoading", isTableLoading);
  console.log("isAddingTable", isAddingTable);
  if (baseError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error</h3>
          <p className="mt-2 text-sm text-gray-500">{baseError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && (!baseTables || baseTables.length === 0)) {
    router.replace("/");
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <BaseTopNavigation baseName={baseName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SecondaryNavigation
          currentTableName={tableData?.name}
          tables={baseTables ?? []}
          currentTableId={tableId}
          onTableSelect={handleTableSelect}
          onTableCreated={handleTableCreated}
        />
        <GridControls
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="relative flex flex-1 overflow-hidden">
          <div
            className={cn(
              "absolute bottom-0 left-0 top-0 z-10 w-60 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
              !isSidebarOpen && "-translate-x-full",
            )}
          >
            <Sidebar
              tables={baseTables ?? []}
              currentTableId={tableId}
              onTableSelect={handleTableSelect}
            />
          </div>
          <div
            className={cn(
              "flex-1 transition-[margin] duration-200 ease-in-out",
              isSidebarOpen && "ml-60",
            )}
          >
            {isTableLoading || isAddingTable ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">
                  {isAddingTable
                    ? "Creating table..."
                    : "Loading table data..."}
                </div>
              </div>
            ) : tableError ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-red-600">Error</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {tableError.message}
                  </p>
                </div>
              </div>
            ) : (
              tableData && (
                <EnhancedDataGrid
                  baseId={baseId}
                  tableId={tableId}
                  initialData={tableData.data}
                  initialColumns={tableData.columns}
                  addRowAction={addRow}
                  addBulkRowsAction={addBulkRows}
                  updateCellAction={updateCell}
                  isAddingRow={isAddingRow}
                  isBatchAdding={isBatchAdding}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
