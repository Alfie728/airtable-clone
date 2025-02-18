"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { type SortingState } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Row, Column } from "~/types/table";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useColumns } from "~/hooks/useColumns";
import { cn } from "~/lib/utils";
import { useRows } from "~/hooks/useRows";
import { RowManagement } from "./RowManagement";
import { Checkbox } from "~/components/ui/checkbox";
import { DraggableColumn } from "./DraggableColumn";
import { useTableConfig } from "./hooks/useTableConfig";
import { type CellType } from "~/types/grid";
import { AddField } from "./components/AddField";
import { GridFooter } from "./components/GridFooter";

const BULK_ADD_ROWS_COUNT = 5000;

interface EnhancedDataGridProps {
  baseId: string;
  tableId: string;
  viewId: string;
  initialData?: Row[];
  initialColumns?: Column[];
  onDataChange?: (data: Row[]) => void;
  onColumnsChange?: (columns: Column[]) => void;
  addRowAction: () => void;
  addBulkRowsAction: (count: number) => void;
  updateCellAction: (params: {
    rowId: string;
    columnId: string;
    value: string;
  }) => Promise<{ success: boolean; error?: string }>;
  isAddingRow: boolean;
  isBatchAdding: boolean;
  sorting: SortingState;
  onSortingChangeAction: (sorting: SortingState) => void;
}

// Add useSkipper hook
function useSkipper() {
  const shouldSkipRef = useRef(true);
  const shouldSkip = shouldSkipRef.current;

  const skip = useCallback(() => {
    shouldSkipRef.current = false;
  }, []);

  useEffect(() => {
    shouldSkipRef.current = true;
  });

  return [shouldSkip, skip] as const;
}

export function EnhancedDataGrid({
  baseId,
  tableId,
  viewId,
  initialData,
  initialColumns,
  onDataChange,
  onColumnsChange,
  addRowAction,
  addBulkRowsAction,
  isAddingRow,
  isBatchAdding,
  sorting,
  onSortingChangeAction,
}: EnhancedDataGridProps) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    (initialColumns ?? [])
      .sort((a, b) => a.order - b.order)
      .map((col) => col.id),
  );
  const [rowOrder, setRowOrder] = useState<Row[]>(() =>
    (initialData ?? []).sort((a, b) => a.order - b.order),
  );
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { reorderRows } = useRows(tableId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rowManagementWidth, setRowManagementWidth] = useState<number>(0);
  const { reorderColumns } = useColumns(tableId);

  // Update row order when initialData changes
  useEffect(() => {
    if (initialData) {
      setRowOrder(initialData.sort((a, b) => a.order - b.order));
    }
  }, [initialData]);

  // Update column order when columns change (new columns added/removed)
  useEffect(() => {
    const sortedColumnIds = (initialColumns ?? [])
      .sort((a, b) => a.order - b.order)
      .map((col) => col.id);

    const hasNewColumns = sortedColumnIds.some(
      (id) => !columnOrder.includes(id),
    );

    if (hasNewColumns) {
      setColumnOrder(sortedColumnIds);
    }
  }, [initialColumns, columnOrder]);

  const columns = useMemo<Column[]>(() => {
    return initialColumns ?? [];
  }, [initialColumns]);

  const data = useMemo<Row[]>(() => {
    // Ensure all rows have all column fields with proper defaults
    return rowOrder.map((row) => {
      const mappedRow = { ...row };
      columns.forEach((col) => {
        if (!(col.name in mappedRow)) {
          mappedRow[col.name] = col.type === "number" ? 0 : "";
        }
      });
      return mappedRow;
    });
  }, [rowOrder, columns]);

  // Function to handle row deletion
  const handleRowDeleted = (deletedRowId: string) => {
    setRowOrder((prevRows) => {
      const deletedRow = prevRows.find((row) => row.id === deletedRowId);
      if (!deletedRow) return prevRows;

      return prevRows
        .filter((row) => row.id !== deletedRowId)
        .map((row) => {
          if (row.order > deletedRow.order) {
            return { ...row, order: row.order - 1 };
          }
          return row;
        });
    });

    // Also update selection state if needed
    setSelectedRows((prev) => prev.filter((id) => id !== deletedRowId));
  };

  // Function to handle bulk row deletion
  const handleBulkRowsDeleted = (deletedRowIds: string[]) => {
    setRowOrder((prevRows) => {
      const rowsToDelete = prevRows.filter((row) =>
        deletedRowIds.includes(row.id),
      );
      if (rowsToDelete.length === 0) return prevRows;

      const minOrder = Math.min(...rowsToDelete.map((row) => row.order));

      return prevRows
        .filter((row) => !deletedRowIds.includes(row.id))
        .map((row) => {
          if (row.order > minOrder) {
            return { ...row, order: row.order - rowsToDelete.length };
          }
          return row;
        });
    });

    // Clear selection after bulk delete
    setSelectedRows([]);
  };

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  useEffect(() => {
    onColumnsChange?.(columns);
  }, [columns, onColumnsChange]);

  const handleColumnOrderChange = (
    updater: string[] | ((old: string[]) => string[]),
  ) => {
    const newOrder =
      typeof updater === "function" ? updater(columnOrder) : updater;

    setColumnOrder(newOrder);

    void reorderColumns({
      columnOrders: newOrder.map((id, index) => ({
        id,
        order: index,
      })),
    }).catch((error) => {
      setColumnOrder(columnOrder);
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder columns",
      );
    });
  };

  const { tableColumns, table, rowVirtualizer, tableContainerRef } =
    useTableConfig({
      columns,
      data,
      initialData,
      tableId,
      sorting,
      columnOrder,
      onSortingChangeAction,
      onColumnOrderChange: handleColumnOrderChange,
    });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {}),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        table.setColumnOrder((old) => arrayMove(old, oldIndex, newIndex));
      }
    }
  };

  const handleRowSelectionChange = (rowId: string, selected: boolean) => {
    setSelectedRows((prev) =>
      selected ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const handleSelectAllRows = (selected: boolean) => {
    setSelectedRows(
      selected ? table.getRowModel().rows.map((row) => row.original.id) : [],
    );
  };

  async function handleAddBulkRows() {
    void addBulkRowsAction(BULK_ADD_ROWS_COUNT);
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={tableContainerRef} className="relative flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
          onDragStart={(event) => {
            setActiveId(event.active.id as string);
          }}
          onDragCancel={() => {
            setActiveId(null);
          }}
        >
          <div className="flex min-w-full">
            <SortableContext
              items={table.getState().columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => {
                  setActiveId(event.active.id as string);
                }}
                onDragCancel={() => {
                  setActiveId(null);
                }}
                onDragEnd={async ({ active, over }) => {
                  setActiveId(null);
                  if (active && over && active.id !== over.id) {
                    const oldIndex = data.findIndex(
                      (row) => row.id === active.id,
                    );
                    const newIndex = data.findIndex(
                      (row) => row.id === over.id,
                    );

                    if (oldIndex !== -1 && newIndex !== -1) {
                      const newData = arrayMove(data, oldIndex, newIndex);

                      // Update local state immediately with new order
                      setRowOrder(
                        newData.map((row, index) => ({
                          ...row,
                          order: index,
                        })),
                      );

                      try {
                        // Sync with server
                        await reorderRows({
                          rowOrders: newData.map((row, index) => ({
                            id: row.id,
                            order: index,
                          })),
                        });
                      } catch (error) {
                        // Revert on error
                        setRowOrder(data);
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Failed to reorder rows",
                        );
                      }
                    }
                  }
                }}
              >
                <SortableContext
                  items={data.map((row) => row.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="flex flex-col border-r border-gray-300 bg-white"
                    style={{
                      width: rowManagementWidth || "84px",
                    }}
                  >
                    <div className="sticky top-0 z-10 border-b border-gray-300 bg-gray-50 shadow-sm">
                      <div className="flex h-8 items-center px-2">
                        <Checkbox
                          checked={
                            table.getRowModel().rows.length > 0 &&
                            selectedRows.length ===
                              table.getRowModel().rows.length
                          }
                          onCheckedChange={handleSelectAllRows}
                          className="ml-[25px] h-3.5 w-3.5 rounded-[4px] border-gray-300"
                          aria-label="Select all rows"
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: "relative",
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = table.getRowModel().rows[virtualRow.index];
                        if (!row) return null;

                        const rowData = row.original;
                        const isDragging = rowData.id === activeId;

                        return (
                          <div
                            key={rowData.id}
                            data-index={virtualRow.index}
                            style={{
                              position: "absolute",
                              top: 0,
                              transform: `translateY(${virtualRow.start}px)`,
                              height: `${virtualRow.size}px`,
                              width: "100%",
                              opacity: isDragging ? 0.8 : 1,
                              zIndex: isDragging ? 1 : 0,
                            }}
                            className={cn(
                              "group flex items-center border-b border-gray-300",
                              isDragging &&
                                "bg-white shadow-xl ring-1 ring-gray-200",
                            )}
                          >
                            <RowManagement
                              tableId={tableId}
                              row={rowData}
                              isSelected={selectedRows.includes(rowData.id)}
                              onSelectionChangeAction={(selected: boolean) =>
                                handleRowSelectionChange(rowData.id, selected)
                              }
                              onRowDeleted={handleRowDeleted}
                              onWidthChange={setRowManagementWidth}
                              dragHandleProps={{
                                attributes: {
                                  "data-index": virtualRow.index,
                                },
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SortableContext>
              </DndContext>
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const columnCells = table
                  .getRowModel()
                  .rows.map((row) => {
                    const cell = row
                      .getVisibleCells()
                      .find((cell) => cell.column.id === header.id);
                    if (!cell) return undefined;
                    return {
                      ...cell,
                      isDragging: row.original.id === activeId,
                    };
                  })
                  .filter(
                    (cell): cell is CellType & { isDragging: boolean } =>
                      cell !== undefined,
                  );

                return (
                  <DraggableColumn
                    key={header.id}
                    header={header}
                    cells={columnCells}
                    virtualizer={rowVirtualizer}
                  />
                );
              }) ?? []}
            </SortableContext>
            <div className="sticky right-0 top-0 z-20 flex h-full items-center border-b border-r border-gray-300 bg-gray-50 px-1 shadow-sm">
              <AddField
                tableId={tableId}
                onColumnUpdated={() => {
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.tables.detail(tableId),
                  });
                }}
              />
            </div>
          </div>
        </DndContext>
      </div>
      <GridFooter
        tableId={tableId}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        addRowAction={addRowAction}
        addBulkRowsAction={handleAddBulkRows}
        isAddingRow={isAddingRow}
        isBatchAdding={isBatchAdding}
        onRowsDeleted={handleBulkRowsDeleted}
      />
    </div>
  );
}
