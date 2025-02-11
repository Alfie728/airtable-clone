"use client";

import { useEffect, useState } from "react";
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

interface BaseClientProps {
  baseId: string;
  initialTableId: string;
  viewId: string;
}

export function BaseClient({
  baseId,
  initialTableId,
  viewId,
}: BaseClientProps) {
  const router = useRouter();
  const [currentTableId, setCurrentTableId] = useState<string>(initialTableId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    baseTables,
  } = useTable(baseId, currentTableId);

  // Single effect to handle routing based on table existence
  useEffect(() => {
    if (!isLoading && baseTables && baseTables.length > 0) {
      // If current table doesn't exist or there's an error, redirect to the first available table
      const tableExists = baseTables.some((t) => t.id === currentTableId);
      const firstTable = baseTables[0];
      if (!tableExists && firstTable?.id) {
        setCurrentTableId(firstTable.id);
        router.replace(`/${baseId}/${firstTable.id}/grid`);
      }
    } else if (!isLoading && (!baseTables || baseTables.length === 0)) {
      // If there are no tables at all, redirect to home
      router.replace("/");
    }
  }, [isLoading, baseTables, currentTableId, baseId, router]);

  const handleTableCreated = (newTable: typeof tables.$inferSelect) => {
    const newUrl = `/${baseId}/${newTable.id}/grid`;
    setCurrentTableId(newTable.id);
    router.push(newUrl, { scroll: false });
  };

  const handleTableSelect = (tableId: string) => {
    const newUrl = `/${baseId}/${tableId}/grid`;
    setCurrentTableId(tableId);
    router.push(newUrl, { scroll: false });
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

  return (
    <div className="flex h-screen flex-col bg-white">
      <BaseTopNavigation baseName={baseName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SecondaryNavigation
          currentTableName={tableData?.name}
          tables={baseTables ?? []}
          currentTableId={currentTableId}
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
              currentTableId={currentTableId}
              onTableSelect={handleTableSelect}
            />
          </div>
          <div
            className={cn(
              "flex-1 transition-[margin] duration-200 ease-in-out",
              isSidebarOpen && "ml-60",
            )}
          >
            {isTableLoading ? (
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
              tableData && (
                <EnhancedDataGrid
                  baseId={baseId}
                  tableId={currentTableId}
                  initialData={tableData.data}
                  initialColumns={tableData.columns}
                  addRow={addRow}
                  addBulkRows={addBulkRows}
                  updateCell={updateCell}
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
