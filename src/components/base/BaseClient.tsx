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
import { getTableData } from "~/lib/actions/tables.action";
import { prefetchTable } from "~/lib/query/prefetch";

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
  const [pendingActiveViewId, setPendingActiveViewId] = useState<string | null>(
    null,
  );
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

  const [isHandlingNavigation, setIsHandlingNavigation] = useState(false);

  // Initialize sorting state from view
  useEffect(() => {
    if (
      initialSortState &&
      JSON.stringify(sorting) !== JSON.stringify(initialSortState)
    ) {
      setSorting(initialSortState);
    }
  }, [initialSortState]);

  // Handle sorting changes
  const handleSortingChange = async (newSorting: SortingState) => {
    if (JSON.stringify(newSorting) === JSON.stringify(sorting)) return;
    setSorting(newSorting);
    try {
      await updateSort(newSorting);
    } catch (error) {
      toast.error("Failed to update sorting");
      // Revert to previous state on error
      setSorting(sorting);
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
    // Skip if we're already handling navigation through handleTableSelect
    if (isHandlingNavigation) return;

    // Clear pendingActiveViewId when navigation is complete
    if (pendingActiveViewId && pendingActiveViewId === viewId) {
      setPendingActiveViewId(null);
      return;
    }

    // Only handle invalid table scenarios
    if (!isBaseLoading && !isTableLoading && baseTables?.length > 0) {
      const isInvalidTable =
        !baseTables.some((t) => t.id === tableId) || tableId === "tables";

      if (isInvalidTable && !isAddingTable) {
        const firstTable = baseTables[0];
        if (!firstTable) return;

        setIsHandlingNavigation(true);

        // Try to get the cached view first
        const cachedView = queryClient.getQueryData<string>(
          queryKeys.tables.views.detail(firstTable.id, "default"),
        );

        if (cachedView) {
          // Set pending view before navigation
          setPendingActiveViewId(cachedView);
          router.replace(`/${baseId}/${firstTable.id}/${cachedView}`, {
            scroll: false,
          });
          setIsHandlingNavigation(false);
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
            setIsHandlingNavigation(false);
            setPendingActiveViewId(null);
            return;
          }

          // Set pending view before navigation
          setPendingActiveViewId(viewId);
          queryClient.setQueryData(
            queryKeys.tables.views.detail(firstTable.id, "default"),
            viewId,
          );

          router.replace(`/${baseId}/${firstTable.id}/${viewId}`, {
            scroll: false,
          });
          setIsHandlingNavigation(false);
        });
      }
    } else if (!isBaseLoading && (!baseTables || baseTables.length === 0)) {
      // Handle empty base case
      router.replace("/");
    }
  }, [
    isBaseLoading,
    isTableLoading,
    baseTables,
    isAddingTable,
    tableId,
    baseId,
    router,
    queryClient,
    isHandlingNavigation,
    pendingActiveViewId,
    viewId,
  ]);

  const handleTableCreated = async (
    newTable: typeof tables.$inferSelect & { defaultViewId?: string },
  ) => {
    try {
      // Set the pending active table ID
      setPendingActiveTableId(newTable.id);

      // Invalidate and wait for the queries to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bases.list() }),
        queryClient.invalidateQueries({ queryKey: ["table", newTable.id] }),
      ]);
      console.log("newTable.defaultViewId", newTable.defaultViewId);
      // Now redirect to the new table with its default view
      if (newTable.defaultViewId) {
        // Set pending view ID before navigation
        setPendingActiveViewId(newTable.defaultViewId);
        router.replace(`/${baseId}/${newTable.id}/${newTable.defaultViewId}`, {
          scroll: false,
        });
      } else {
        // Show loading state while getting default view
        router.replace(`/${baseId}/${newTable.id}/loading`, {
          scroll: false,
        });

        // Fallback to getting the default view if not provided
        const { viewId, error } = await getDefaultView(newTable.id);
        if (!viewId) {
          console.error("Failed to get or create default view:", error);
          toast.error(
            "Failed to load table view. Please contact support if this persists.",
          );
          return;
        }

        // Set pending view ID before navigation
        setPendingActiveViewId(viewId);
        router.replace(`/${baseId}/${newTable.id}/${viewId}`, {
          scroll: false,
        });
      }
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error handling table creation:", error);
      toast.error("Error creating table. Please try again.");
      setPendingActiveTableId(null);
      setPendingActiveViewId(null);
    }
  };

  const handleTableSelect = async (tableId: string) => {
    setPendingActiveTableId(null);
    setIsHandlingNavigation(true);

    // Get cached view
    const cachedView = queryClient.getQueryData<string>(
      queryKeys.tables.views.detail(tableId, "default"),
    );

    if (cachedView) {
      // Set pending view before navigation
      setPendingActiveViewId(cachedView);
      // Navigate immediately
      router.push(`/${baseId}/${tableId}/${cachedView}`, {
        scroll: false,
      });
      setIsHandlingNavigation(false);
      return;
    }

    // If no cached view, start loading state immediately
    router.push(`/${baseId}/${tableId}/loading`, { scroll: false });

    try {
      // Start prefetching table data in parallel with getting default view
      const prefetchPromise = !queryClient.getQueryData(
        queryKeys.tables.detail(tableId),
      )
        ? prefetchTable(
            queryClient,
            tableId,
            baseTables?.find((t) => t.id === tableId)?.name ?? "",
          )
        : Promise.resolve();

      const viewPromise = getDefaultView(tableId);

      // Wait for both operations in parallel
      const [_, { viewId, error }] = await Promise.all([
        prefetchPromise,
        viewPromise,
      ]);

      if (!viewId) {
        console.error("Failed to get or create default view:", error);
        toast.error(
          "Failed to load table view. Please contact support if this persists.",
        );
        setIsHandlingNavigation(false);
        setPendingActiveViewId(null);
        return;
      }

      // Set pending view before navigation
      setPendingActiveViewId(viewId);
      // Cache the view ID and navigate
      queryClient.setQueryData(
        queryKeys.tables.views.detail(tableId, "default"),
        viewId,
      );
      router.replace(`/${baseId}/${tableId}/${viewId}`, { scroll: false });
      setIsHandlingNavigation(false);
    } catch (error) {
      console.error("Error during table selection:", error);
      toast.error("Failed to load table. Please try again.");
      setIsHandlingNavigation(false);
      setPendingActiveViewId(null);
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
          pendingActiveViewId={pendingActiveViewId}
          setPendingActiveViewId={setPendingActiveViewId}
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
              "absolute bottom-0 left-0 top-[136px] z-20 w-60 border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
              !isSidebarOpen && "-translate-x-full",
            )}
          >
            <Sidebar
              views={tableViews ?? []}
              currentViewId={viewId}
              pendingActiveViewId={pendingActiveViewId}
              onViewSelect={(selectedViewId) => {
                setPendingActiveViewId(selectedViewId);
                router.push(`/${baseId}/${tableId}/${selectedViewId}`, {
                  scroll: false,
                });
              }}
              isAddingView={false}
              isLoading={isViewsLoading}
            />
          </div>
        )}

        <div className="relative flex flex-1 overflow-scroll">
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
