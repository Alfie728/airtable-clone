"use client";

import { useState, useEffect } from "react";
import type { tables } from "~/server/db/schema";
import { BaseTopNavigation } from "~/components/layout/TopNavigation";
import { EnhancedDataGrid } from "~/components/grid/EnhancedDataGrid";
import { GridControls } from "~/components/grid/GridControls";
import { Sidebar } from "~/components/layout/Sidebar";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { useTableData } from "~/hooks/useTableData";
import { useBase } from "~/hooks/useBase";
import { cn } from "~/lib/utils";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDefaultView, createView } from "~/lib/actions/views.action";
import { useViews } from "~/hooks/useViews";
import { useLocalStorageBoolean } from "~/hooks/useLocalStorage";
import { queryKeys } from "~/lib/query/keys";
import { prefetchTable } from "~/lib/query/prefetch";
import { useTableStructure } from "~/hooks/useTableStructure";
import { type SortingState } from "@tanstack/react-table";
import type { FilterPreference } from "~/types/filter";

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
  const queryClient = useQueryClient();

  const {
    baseName,
    isLoading: isBaseLoading,
    tables: baseTables,
    addTable,
    isAddingTable,
    error: baseError,
  } = useBase(baseId);

  const tableName = baseTables.find((t) => t.id === tableId)?.name ?? "";

  // Get table structure separately to prevent UI flickering
  const { data: structureData } = useTableStructure(tableId);

  const {
    tableData,
    isLoading,
    error,
    addRow,
    addBulkRows,
    updateCell,
    isAddingRow,
    isBatchAdding,
    renameTable,
    isRenaming,
    sortState,
    handleSortChange,
    filterState,
    handleFilterChange,
    searchValue,
    handleSearchChange,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTableData({ baseId, tableId, tableName, viewId });

  const {
    views: tableViews,
    isLoading: isViewsLoading,
    error: viewsError,
    createView,
    isCreatingView,
    deleteView,
    isDeletingView,
    renameView,
    isRenamingView,
  } = useViews(tableId);

  const [isHandlingNavigation, setIsHandlingNavigation] = useState(false);

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

    // Only handle invalid table scenarios
    if (!isBaseLoading && !isLoading && baseTables?.length > 0) {
      const isInvalidTable =
        !baseTables.some((t) => t.id === tableId) || tableId === "tables";

      if (isInvalidTable && !isAddingTable) {
        const firstTable = baseTables[0];
        if (!firstTable) return;

        setIsHandlingNavigation(true);

        // Try to get the cached view first
        const cachedView = queryClient.getQueryData<string>(
          queryKeys.views.detail("default"),
        );

        if (cachedView) {
          // Use replace instead of push to avoid history stack issues
          router.replace(`/${baseId}/${firstTable.id}/${cachedView}`);
          setIsHandlingNavigation(false);
          return;
        }

        // If no cached view, redirect to base page
        router.replace(`/${baseId}`);
        setIsHandlingNavigation(false);
      }
    } else if (!isBaseLoading && (!baseTables || baseTables.length === 0)) {
      // Handle empty base case
      router.replace("/");
    }
  }, [
    isBaseLoading,
    isLoading,
    baseTables,
    isAddingTable,
    tableId,
    baseId,
    router,
    queryClient,
    isHandlingNavigation,
  ]);

  // Clear pending states when navigation is complete
  useEffect(() => {
    if (!isHandlingNavigation) {
      setPendingActiveTableId(null);
      setPendingActiveViewId(null);
    }
  }, [isHandlingNavigation]);

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
      queryKeys.views.detail("default"),
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
      queryClient.setQueryData(queryKeys.views.detail("default"), viewId);
      router.replace(`/${baseId}/${tableId}/${viewId}`, { scroll: false });
      setIsHandlingNavigation(false);
    } catch (error) {
      console.error("Error during table selection:", error);
      toast.error("Failed to load table. Please try again.");
      setIsHandlingNavigation(false);
      setPendingActiveViewId(null);
    }
  };

  const handleCreateView = async (type: "grid") => {
    try {
      const newView = await createView(type);
      // Navigate to the new view
      setPendingActiveViewId(newView.id);
      router.push(`/${baseId}/${tableId}/${newView.id}`, {
        scroll: false,
      });
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error in handleCreateView:", error);
    }
  };

  const handleDeleteView = async (viewToDeleteId: string) => {
    try {
      await deleteView(viewToDeleteId);
      // If we're deleting the current view, navigate to another view
      if (viewToDeleteId === viewId) {
        const remainingViews = tableViews?.filter(
          (v) => v.id !== viewToDeleteId,
        );
        const defaultView = remainingViews?.find((v) => v.isDefault);
        if (defaultView) {
          setPendingActiveViewId(defaultView.id);
          router.push(`/${baseId}/${tableId}/${defaultView.id}`, {
            scroll: false,
          });
        }
      }
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error in handleDeleteView:", error);
    }
  };

  const handleRenameView = async (viewToRenameId: string, newName: string) => {
    try {
      await renameView({ viewId: viewToRenameId, name: newName });
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error in handleRenameView:", error);
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
          columns={structureData?.success ? structureData.columns : []}
          sorting={sortState}
          onSortingChange={handleSortChange}
          filtering={filterState}
          onFilteringChange={handleFilterChange}
          onSearch={handleSearchChange}
        />

        {!isAddingTable && (
          <div
            className={cn(
              "absolute bottom-0 left-0 top-[136px] z-20 w-[282px] border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
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
              onCreateView={handleCreateView}
              onRenameView={handleRenameView}
              onDeleteView={handleDeleteView}
              isAddingView={isCreatingView}
              isRenamingView={isRenamingView}
              isDeletingView={isDeletingView}
              isLoading={isViewsLoading}
            />
          </div>
        )}

        <div className="relative flex flex-1 overflow-auto">
          <div
            className={cn(
              "flex-1 transition-[margin] duration-200 ease-in-out",
              isSidebarOpen && !isAddingTable && "ml-[282px]",
            )}
          >
            {isAddingTable ||
            (pendingActiveTableId && tableId === pendingActiveTableId) ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">Creating table...</div>
              </div>
            ) : isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-gray-500">
                  Loading table data...
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-red-600">Error</h3>
                  <p className="mt-2 text-sm text-gray-500">{error.message}</p>
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
                  sorting={sortState}
                  onSortingChangeAction={handleSortChange}
                  filtering={filterState}
                  onFilteringChangeAction={handleFilterChange}
                  globalSearch={searchValue}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
