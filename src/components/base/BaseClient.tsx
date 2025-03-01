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
import {
  getDefaultView,
  createView,
  getTableViews,
} from "~/lib/actions/views.action";
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
    getDefaultViewId,
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
          queryKeys.views.default(firstTable.id),
        );

        if (cachedView) {
          // Use replace instead of push to avoid history stack issues
          router.replace(`/${baseId}/${firstTable.id}/${cachedView}`);
          setIsHandlingNavigation(false);
          return;
        }

        // If no cached view, get the default view
        getDefaultView(firstTable.id)
          .then((result) => {
            console.log("[UI] Default view response in useEffect:", result);

            if (result.viewId && typeof result.viewId === "string") {
              // Ensure viewId is a string
              const viewIdString = String(result.viewId);
              console.log(
                "[UI] Using viewId:",
                viewIdString,
                "type:",
                typeof viewIdString,
              );

              // Cache the view ID for future use
              queryClient.setQueryData(
                queryKeys.views.default(firstTable.id),
                viewIdString,
              );
              router.replace(`/${baseId}/${firstTable.id}/${viewIdString}`);
            } else {
              console.error("Failed to get default view:", result.error);
              // Fallback to base page
              router.replace(`/${baseId}`);
            }
          })
          .catch((err) => {
            console.error("Error getting default view:", err);
            router.replace(`/${baseId}`);
          })
          .finally(() => {
            setIsHandlingNavigation(false);
          });
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

  const handleTableSelect = async (newTableId: string) => {
    setPendingActiveTableId(null);
    setIsHandlingNavigation(true);

    try {
      // Start prefetching table data and views in parallel
      const prefetchPromises = [
        !queryClient.getQueryData(queryKeys.tables.detail(newTableId))
          ? prefetchTable(
              queryClient,
              newTableId,
              baseTables?.find((t) => t.id === newTableId)?.name ?? "",
            )
          : Promise.resolve(),
        // Also prefetch views list to prevent empty sidebar
        queryClient.prefetchQuery({
          queryKey: queryKeys.views.list(newTableId),
          queryFn: async () => {
            const viewsResult = await getTableViews(newTableId);
            if (!viewsResult.success) {
              throw new Error(viewsResult.error ?? "Failed to get views");
            }
            return viewsResult.views;
          },
          staleTime: 5 * 1000,
        }),
      ];

      // Try to get from cache first
      const cachedId = queryClient.getQueryData<string>(
        queryKeys.views.default(newTableId),
      );

      if (typeof cachedId === "string") {
        // Wait for prefetch to complete
        await Promise.all(prefetchPromises);

        // Ensure cachedId is a string
        const viewIdString = String(cachedId);
        console.log(
          "[UI] Using cached viewId:",
          viewIdString,
          "type:",
          typeof viewIdString,
        );

        // Set pending view before navigation
        setPendingActiveViewId(viewIdString);

        // Ensure we're using a string in the URL
        const url = `/${baseId}/${newTableId}/${viewIdString}`;
        console.log("[UI] Navigating to URL:", url);

        // Navigate
        router.replace(url, {
          scroll: false,
        });
        return;
      }

      // If not in cache, fetch it directly
      const result = await getDefaultView(newTableId);
      console.log("[UI] Default view response in handleTableSelect:", result);

      // Handle case where the table doesn't exist
      if (result.error?.includes("does not exist")) {
        console.log("[UI] Table not found, navigating to base page");
        router.replace(`/${baseId}`);
        return;
      }

      if (!result.viewId || typeof result.viewId !== "string") {
        throw new Error(
          result.error ?? "Failed to get default view or invalid view ID",
        );
      }

      // Ensure viewId is a string
      const viewIdString = String(result.viewId);
      console.log(
        "[UI] Got valid viewId as string:",
        viewIdString,
        "type:",
        typeof viewIdString,
      );

      // Wait for prefetch to complete
      await Promise.all(prefetchPromises);

      // Set pending view before navigation
      setPendingActiveViewId(viewIdString);

      // Cache the view ID
      queryClient.setQueryData(
        queryKeys.views.default(newTableId),
        viewIdString,
      );

      // Ensure we're using a string in the URL
      const url = `/${baseId}/${newTableId}/${viewIdString}`;
      console.log("[UI] Navigating to URL:", url);

      // Navigate
      router.replace(url, { scroll: false });
    } catch (error) {
      console.error("Error during table selection:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load table view",
      );
      // Reset navigation state
      setIsHandlingNavigation(false);
      setPendingActiveViewId(null);
    } finally {
      setIsHandlingNavigation(false);
    }
  };

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

      // If we have a defaultViewId from table creation, use it
      if (
        newTable.defaultViewId &&
        typeof newTable.defaultViewId === "string"
      ) {
        const viewIdString = String(newTable.defaultViewId);
        setPendingActiveViewId(viewIdString);
        router.replace(`/${baseId}/${newTable.id}/${viewIdString}`, {
          scroll: false,
        });
        return;
      }

      // Get default view with improved error handling
      const result = await getDefaultViewId();
      console.log("[UI] Default view response in handleTableCreated:", result);

      // Handle case where the table doesn't exist
      if (
        result.error?.includes("does not exist") ||
        result.error === "TABLE_NOT_FOUND"
      ) {
        console.log("[UI] Table not found, navigating to base page");
        router.replace(`/${baseId}`);
        return;
      }

      if (!result.viewId || typeof result.viewId !== "string") {
        throw new Error(
          result.error ?? "Failed to get default view or invalid view ID",
        );
      }

      // Ensure viewId is a string
      const viewIdString = String(result.viewId);
      console.log(
        "[UI] Got valid viewId as string:",
        viewIdString,
        "type:",
        typeof viewIdString,
      );

      // Set pending view before navigation
      setPendingActiveViewId(viewIdString);

      // Ensure we're using a string in the URL
      const url = `/${baseId}/${newTable.id}/${viewIdString}`;
      console.log("[UI] Navigating to URL:", url);

      router.replace(url, {
        scroll: false,
      });
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Error handling table creation:", error);
      toast.error("Error creating table. Please try again.");
      setPendingActiveTableId(null);
      setPendingActiveViewId(null);
    }
  };

  const handleCreateView = async (type: "grid") => {
    try {
      const newView = await createView(type);

      // Ensure viewId is a string
      const viewIdString = String(newView.id);
      console.log(
        "[UI] Created new view:",
        viewIdString,
        "type:",
        typeof viewIdString
      );

      // Navigate to the new view
      setPendingActiveViewId(viewIdString);
      
      // Ensure we're using a string in the URL
      const url = `/${baseId}/${tableId}/${viewIdString}`;
      console.log("[UI] Navigating to URL:", url);
      
      router.push(url, {
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
          // Ensure viewId is a string
          const viewIdString = String(defaultView.id);
          console.log(
            "[UI] Navigating to default view after deletion:",
            viewIdString,
            "type:",
            typeof viewIdString,
          );

          setPendingActiveViewId(viewIdString);

          // Ensure we're using a string in the URL
          const url = `/${baseId}/${tableId}/${viewIdString}`;
          console.log("[UI] Navigating to URL:", url);

          router.push(url, {
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
                // Ensure selectedViewId is a string
                const viewIdString = String(selectedViewId);
                console.log(
                  "[UI] View selected:",
                  viewIdString,
                  "type:",
                  typeof viewIdString,
                );

                setPendingActiveViewId(viewIdString);
                // Invalidate view and table data to ensure consistency
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.views.data.root(tableId, viewIdString),
                });
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.tables.data.root(tableId),
                });

                // Ensure we're using a string in the URL
                const url = `/${baseId}/${tableId}/${viewIdString}`;
                console.log("[UI] Navigating to URL:", url);

                router.push(url, {
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
