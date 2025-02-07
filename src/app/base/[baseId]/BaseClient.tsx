"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { tables } from "~/server/db/schema";
import { TopNavigation } from "~/components/layout/TopNavigation";
import { EnhancedDataGrid } from "~/components/grid/EnhancedDataGrid";
import { GridControls } from "~/components/grid/GridControls";
import { Sidebar } from "~/components/layout/Sidebar";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { useTable } from "~/hooks/useTable";

interface TableData {
  id: string;
  name: string;
  columns: {
    id: string;
    name: string;
    type: "text" | "number";
    order: number;
    width: number;
    isSearchable: boolean;
    isSortable: boolean;
    isVisible: boolean;
  }[];
  data: {
    id: string;
    [key: string]: string | number;
  }[];
}

interface SerializedTable {
  id: string;
  name: string;
  description: string | null;
  baseId: string;
  rowCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface BaseData {
  id: string;
  name: string;
  tables: SerializedTable[];
  currentTable: TableData | null;
}

interface BaseClientProps {
  baseId: string;
}

// Helper function to convert string dates to Date objects
function deserializeTable(table: SerializedTable): typeof tables.$inferSelect {
  return {
    ...table,
    createdAt: new Date(table.createdAt),
    updatedAt: table.updatedAt ? new Date(table.updatedAt) : null,
  };
}

export function BaseClient({ baseId }: BaseClientProps) {
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);

  // Use the table hook for data fetching and mutations
  const {
    tableData,
    baseTables,
    isLoading,
    isBaseLoading,
    error,
    baseError,
    addRow,
    updateCell,
    isAddingRow,
    isUpdatingCell,
  } = useTable(baseId, currentTableId ?? "");

  // Set initial table ID when base data is loaded
  useEffect(() => {
    if (baseTables && baseTables.length > 0 && !currentTableId) {
      setCurrentTableId(baseTables[0].id);
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

  if (isBaseLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-gray-500">Loading base data...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNavigation showBaseOptions baseName={tableData?.name ?? "My Base"} />
      <main className="flex-1">
        <div className="flex h-full">
          <Sidebar
            tables={baseTables ?? []}
            currentTableId={currentTableId}
            onTableSelect={handleTableSelect}
          />
          <div className="flex-1">
            <SecondaryNavigation
              currentTableName={tableData?.name}
              tables={baseTables ?? []}
              currentTableId={currentTableId}
              onTableSelect={handleTableSelect}
              onTableCreated={handleTableCreated}
            />
            <GridControls />
            {tableData ? (
              <div className="space-y-8 p-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{tableData.name}</h2>
                  {isLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-md border">
                      <div className="text-sm text-gray-500">
                        Loading table data...
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex h-64 items-center justify-center rounded-md border">
                      <div className="text-sm text-red-500">
                        {error instanceof Error
                          ? error.message
                          : "Failed to load table data"}
                      </div>
                    </div>
                  ) : (
                    <EnhancedDataGrid
                      tableId={currentTableId!}
                      initialData={tableData.data}
                      initialColumns={tableData.columns}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-900">
                    No tables
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new table
                  </p>
                  <div className="mt-6">
                    <button className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      Create table
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
