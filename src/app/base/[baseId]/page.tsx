"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import type { tables } from "~/server/db/schema";
import { TopNavigation } from "~/components/layout/TopNavigation";
import { EnhancedDataGrid } from "~/components/grid/EnhancedDataGrid";
import { GridControls } from "~/components/grid/GridControls";
import { Sidebar } from "~/components/layout/Sidebar";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { getTables, getTableData } from "~/lib/actions/tables.action";

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

interface BaseData {
  id: string;
  name: string;
  tables: Array<typeof tables.$inferSelect>;
  currentTable: TableData | null;
}

export default function BasePage() {
  const params = useParams();
  const [base, setBase] = useState<BaseData | null>(null);
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load base and tables
  useEffect(() => {
    async function loadBase() {
      try {
        const baseId = params.baseId as string;
        const { success, tables: baseTables } = await getTables(baseId);

        if (!success || !baseTables) {
          notFound();
        }

        setBase((prev) => ({
          id: baseId,
          name: prev?.name ?? "My Base",
          tables: baseTables,
          currentTable: prev?.currentTable ?? null,
        }));

        // Set initial table ID if not set
        if (!currentTableId && baseTables?.[0]?.id) {
          setCurrentTableId(baseTables[0].id);
        }
      } catch (error) {
        console.error("Error loading base:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadBase();
  }, [params.baseId]);

  // Load table data when table ID changes
  useEffect(() => {
    async function loadTableData() {
      if (!currentTableId || !base) return;

      try {
        const tableToLoad = base.tables.find((t) => t.id === currentTableId);
        if (!tableToLoad) return;

        const { success, table: tableData } = await getTableData(
          tableToLoad.id,
          tableToLoad.name,
        );

        if (success && tableData) {
          setBase((prev) =>
            prev
              ? {
                  ...prev,
                  currentTable: tableData,
                }
              : null,
          );
        }
      } catch (error) {
        console.error("Error loading table data:", error);
      }
    }

    void loadTableData();
  }, [currentTableId, base?.tables]);

  const handleTableCreated = (newTable: typeof tables.$inferSelect) => {
    setBase((prev) =>
      prev
        ? {
            ...prev,
            tables: [...prev.tables, newTable],
          }
        : null,
    );
    setCurrentTableId(newTable.id);
  };

  if (isLoading) {
    return null;
  }

  if (!base) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNavigation showBaseOptions baseName={base.name} />
      <main className="flex-1">
        <div className="flex h-full">
          <Sidebar
            tables={base.tables}
            currentTableId={currentTableId}
            onTableSelect={setCurrentTableId}
          />
          <div className="flex-1">
            <SecondaryNavigation
              currentTableName={base.currentTable?.name}
              tables={base.tables}
              currentTableId={currentTableId}
              onTableSelect={setCurrentTableId}
              onTableCreated={handleTableCreated}
            />
            <GridControls />
            {base.currentTable ? (
              <div className="space-y-8 p-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    {base.currentTable.name}
                  </h2>
                  <EnhancedDataGrid
                    initialData={base.currentTable.data}
                    initialColumns={base.currentTable.columns}
                  />
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
