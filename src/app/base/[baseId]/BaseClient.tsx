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

// interface SerializedTable {
//   id: string;
//   name: string;
//   description: string | null;
//   baseId: string;
//   rowCount: number;
//   createdAt: string;
//   updatedAt: string | null;
// }

// interface BaseData {
//   id: string;
//   name: string;
//   tables: SerializedTable[];
//   currentTable: TableData | null;
// }

interface BaseClientProps {
  baseId: string;
  initialTableData?: TableResponse;
  initialTableId: string;
}

// Helper function to convert string dates to Date objects
// function deserializeTable(table: SerializedTable): typeof tables.$inferSelect {
//   return {
//     ...table,
//     createdAt: new Date(table.createdAt),
//     updatedAt: table.updatedAt ? new Date(table.updatedAt) : null,
//   };
// }

export function BaseClient({
  baseId,
  initialTableData,
  initialTableId,
}: BaseClientProps) {
  const [currentTableId, setCurrentTableId] = useState<string | null>(
    initialTableId,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { tableData, baseTables, isLoading, isBaseLoading, error, baseError } =
    useTable(baseId, currentTableId ?? "", initialTableData);

  const { baseName, isLoading: isBaseNameLoading } = useBase(baseId);

  useEffect(() => {
    if (baseTables && baseTables.length > 0 && !currentTableId) {
      setCurrentTableId(baseTables[0]?.id ?? null);
    }
  }, [baseTables, currentTableId]);

  const handleTableCreated = (newTable: typeof tables.$inferSelect) => {
    setCurrentTableId(newTable.id);
  };

  const handleTableSelect = (tableId: string) => {
    setCurrentTableId(tableId);
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
                  tableId={currentTableId!}
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
