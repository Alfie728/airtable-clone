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
import type { TableResponse } from "~/hooks/useTable";
import { useRouter } from "next/navigation";

interface BaseClientProps {
  baseId: string;
  initialTableData?: TableResponse;
  initialTableId: string;
  viewId: string;
}

export function BaseClient({
  baseId,
  initialTableData,
  initialTableId,
  viewId,
}: BaseClientProps) {
  const router = useRouter();
  const [currentTableId, setCurrentTableId] = useState<string>(initialTableId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { tableData, baseTables, isLoading, isBaseLoading, error, baseError } =
    useTable(baseId, currentTableId, initialTableData);

  const { baseName, isLoading: isBaseNameLoading } = useBase(baseId);

  useEffect(() => {
    if (baseTables && baseTables.length > 0 && !currentTableId) {
      const firstTableId = baseTables[0]?.id;
      if (firstTableId) {
        setCurrentTableId(firstTableId);
        router.push(`/${baseId}/${firstTableId}/grid`, { scroll: false });
      }
    }
  }, [baseTables, currentTableId, baseId, router]);

  const handleTableCreated = (newTable: typeof tables.$inferSelect) => {
    const newUrl = `/${baseId}/${newTable.id}/grid`;
    window.history.pushState({}, "", newUrl);
    setCurrentTableId(newTable.id);
    router.push(newUrl, { scroll: false });
  };

  const handleTableSelect = (tableId: string) => {
    const newUrl = `/${baseId}/${tableId}/grid`;
    window.history.pushState({}, "", newUrl);
    setCurrentTableId(tableId);
    router.push(newUrl, { scroll: false });
  };

  if (baseError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600">Error</h3>
          <p className="mt-2 text-sm text-gray-500">
            {baseError instanceof Error
              ? baseError.message
              : "Failed to load base data"}
          </p>
        </div>
      </div>
    );
  }

  if (isBaseLoading || isBaseNameLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading base data...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <BaseTopNavigation baseName={baseName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SecondaryNavigation
          currentTableName={tableData?.table?.name}
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
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">
                  Loading table data...
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-red-600">Error</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {error instanceof Error
                      ? error.message
                      : "Failed to load table data"}
                  </p>
                </div>
              </div>
            ) : (
              tableData?.success &&
              tableData.table && (
                <EnhancedDataGrid
                  tableId={currentTableId}
                  initialData={tableData.table.data}
                  initialColumns={tableData.table.columns}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
