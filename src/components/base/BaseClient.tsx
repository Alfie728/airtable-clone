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
import { getDefaultView } from "~/lib/actions/views.action";
import { useViews } from "~/hooks/useViews";
import { useLocalStorageBoolean } from "~/hooks/useLocalStorage";
import { queryKeys } from "~/lib/query/keys";
import { type SortingState } from "@tanstack/react-table";
import { useTableSort } from "~/hooks/useTableSort";

interface BaseClientProps {
  baseId: string;
  tableId: string;
  viewId: string;
}

export function BaseClient({ baseId, tableId, viewId }: BaseClientProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useLocalStorageBoolean(
    "sidebarOpen",
    true,
  );
  const [pendingActiveTableId, setPendingActiveTableId] = useState<
    string | null
  >(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const queryClient = useQueryClient();
  const {
    initialSortState,
    updateSort,
    isUpdating: isUpdatingSort,
  } = useTableSort(viewId);

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
    renameTable,
    isRenaming,
  } = useTable(baseId, tableId);

  const {
    views: tableViews,
    isLoading: isViewsLoading,
    error: viewsError,
  } = useViews(tableId);

  // Initialize sorting state from view
  useEffect(() => {
    if (initialSortState) {
      setSorting(initialSortState);
    }
  }, [initialSortState]);

  // Handle sorting changes
  const handleSortingChange = async (newSorting: SortingState) => {
    setSorting(newSorting);
    try {
      await updateSort(newSorting);
    } catch (error) {
      toast.error("Failed to update sorting");
      // Revert to previous state on error
      if (initialSortState) {
        setSorting(initialSortState);
      }
    }
  };

  // Add error handling for views
  useEffect(() => {
    if (viewsError) {
      toast.error(viewsError.message ?? "Failed to load views");
    }
  }, [viewsError]);

  // Handle navigation for empty base and invalid table ID
  useEffect(() => {
    function handleNavigation() {
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
            // Try to get the cached view first
            const cachedView = queryClient.getQueryData<string>(
              queryKeys.tables.views.list(firstTable.id),
            );

            if (cachedView) {
              router.replace(`/${baseId}/${firstTable.id}/${cachedView}`, {
                scroll: false,
              });
              return;
            }

            // If no cached view, show loading state and fetch it
            router.replace(`/${baseId}/${firstTable.id}/loading`, {
              scroll: false,
            });
            void getDefaultView(firstTable.id).then(({ viewId, error }) => {
              if (!viewId) {
                console.error("Failed to get or create default view:", error);
                toast.error(
                  "Failed to load table view. Please contact support if this persists.",
                );
                return;
              }
              // Cache the view ID for future use
              queryClient.setQueryData(
                queryKeys.tables.views.list(firstTable.id),
                viewId,
              );
              router.replace(`/${baseId}/${firstTable.id}/${viewId}`, {
                scroll: false,
              });
            });
          }
        }
      }
    }
    handleNavigation();
  }, [
    isBaseLoading,
    isTableLoading,
    baseTables,
    isAddingTable,
    tableId,
    baseId,
    router,
    queryClient,
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
    try {
      setPendingActiveTableId(null);

      // Start navigation immediately with a loading state
      router.prefetch(`/${baseId}/${tableId}/grid`);

      // Try to get the cached view first
      const cachedView = queryClient.getQueryData<string>(
        queryKeys.tables.views.list(tableId),
      );
      if (cachedView) {
        router.replace(`/${baseId}/${tableId}/${cachedView}`, {
          scroll: false,
        });
        return;
      }

      // If no cached view, show loading state and fetch it
      router.replace(`/${baseId}/${tableId}/loading`, { scroll: false });
      void getDefaultView(tableId).then(({ viewId, error }) => {
        if (!viewId) {
          console.error("Failed to get or create default view:", error);
          toast.error(
            "Failed to load table view. Please contact support if this persists.",
          );
          return;
        }
        // Cache the view ID for future use
        queryClient.setQueryData(queryKeys.tables.views.list(tableId), viewId);
        router.replace(`/${baseId}/${tableId}/${viewId}`, { scroll: false });
      });
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error handling table selection:", error);
      toast.error(
        "Error selecting table. Please contact support if this persists.",
      );
    }
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

  // Instead, show loading state during transitions
  if (isBaseLoading || (!baseTables && !isBaseLoading)) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <BaseTopNavigation baseName={baseName} baseId={baseId} />
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <BaseTopNavigation baseName={baseName} baseId={baseId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SecondaryNavigation
          currentTableName={tableData?.name}
          tables={baseTables ?? []}
          currentTableId={tableId}
          onTableSelect={handleTableSelect}
          onTableCreated={handleTableCreated}
          addTableAction={addTable}
          isAddingTable={isAddingTable}
          pendingActiveTableId={pendingActiveTableId}
          renameTable={async (newName) => {
            const result = await renameTable(newName);
            if (!result.success) {
              throw new Error(
                typeof result.error === "string"
                  ? result.error
                  : "Failed to rename table",
              );
            }
            return result;
          }}
          isRenaming={isRenaming}
        />
        <GridControls
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          columns={tableData?.columns ?? []}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />

        {!isAddingTable && (
          <div
            className={cn(
              "absolute bottom-0 left-0 top-[136px] z-10 w-60 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
              !isSidebarOpen && "-translate-x-full",
            )}
          >
            <Sidebar
              views={tableViews ?? []}
              currentViewId={viewId}
              onViewSelect={(selectedViewId) => {
                router.push(`/${baseId}/${tableId}/${selectedViewId}`, {
                  scroll: false,
                });
              }}
              isAddingView={false}
            />
          </div>
        )}

        <div className="relative flex flex-1 overflow-scroll scrollbar-hide">
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
                  viewId={viewId}
                  initialData={tableData.data}
                  initialColumns={tableData.columns}
                  addRowAction={addRow}
                  addBulkRowsAction={addBulkRows}
                  updateCellAction={updateCell}
                  isAddingRow={isAddingRow}
                  isBatchAdding={isBatchAdding}
                  sorting={sorting}
                  onSortingChange={handleSortingChange}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
