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
  const [pendingActiveTableId, setPendingActiveTableId] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();

  const {
    baseName,
    isLoading: isBaseLoading,
    tables: baseTables,
    addTable,
    isAddingTable,
    error: baseError,
  } = useBase(baseId);
  const {
    tableData,
    isLoading: isTableLoading,
    tableError,
    addRow,
    addBulkRows,
    updateCell,
    isAddingRow,
    isBatchAdding,
  } = useTable(baseId, tableId);

  // Handle navigation for empty base and invalid table ID
  useEffect(() => {
    if (!isBaseLoading && !isTableLoading) {
      // Only handle navigation after both base and table data are loaded
      if (!baseTables || baseTables.length === 0) {
        router.replace("/");
      } else if (
        !isAddingTable &&
        baseTables.length > 0 &&
        (tableId === "tables" || !baseTables.some((t) => t.id === tableId))
      ) {
        const firstTable = baseTables[0];
        if (firstTable) {
          router.replace(`/${baseId}/${firstTable.id}/grid`, { scroll: false });
        }
      }
    }
  }, [
    isBaseLoading,
    isTableLoading,
    baseTables,
    isAddingTable,
    tableId,
    baseId,
    router,
  ]);

  const handleTableCreated = async (newTable: typeof tables.$inferSelect) => {
    try {
      // Set the pending active table ID
      setPendingActiveTableId(newTable.id);

      // Invalidate and wait for the queries to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["base", baseId] }),
        queryClient.invalidateQueries({ queryKey: ["table", newTable.id] }),
      ]);

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
    setPendingActiveTableId(null);
    router.replace(`/${baseId}/${tableId}/grid`, { scroll: false });
  };

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

  // Remove the direct navigation logic from render
  if (!isBaseLoading && (!baseTables || baseTables.length === 0)) {
    return null;
  }

  // Remove the direct navigation logic from render
  if (
    !isBaseLoading &&
    !isAddingTable &&
    baseTables?.length > 0 &&
    (tableId === "tables" || !baseTables.some((t) => t.id === tableId))
  ) {
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
          addTable={addTable}
          isAddingTable={isAddingTable}
          pendingActiveTableId={pendingActiveTableId}
        />
        <GridControls
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="relative flex flex-1 overflow-hidden">
          {!isAddingTable && (
            <div
              className={cn(
                "absolute bottom-0 left-0 top-0 z-10 w-60 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
                !isSidebarOpen && "-translate-x-full",
              )}
            >
              <Sidebar
                isAddingTable={isAddingTable}
                tables={baseTables ?? []}
                currentTableId={tableId}
                onTableSelect={handleTableSelect}
                pendingActiveTableId={pendingActiveTableId}
              />
            </div>
          )}

          <div
            className={cn(
              "flex-1 transition-[margin] duration-200 ease-in-out",
              isSidebarOpen && !isAddingTable && "ml-60",
            )}
          >
            {isAddingTable ||
            (pendingActiveTableId && tableId === pendingActiveTableId) ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">Creating table...</div>
              </div>
            ) : isTableLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">
                  Loading table data...
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
              tableData &&
              !pendingActiveTableId && (
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
