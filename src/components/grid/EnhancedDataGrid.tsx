"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Table,
  type ColumnDef,
  type Row as TableRow,
  type Header,
  type Cell,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  Plus,
  X,
  GripVertical,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Row, Column } from "~/types/table";
import { ColumnManagement } from "./ColumnManagement";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { useColumns } from "~/hooks/useColumns";
import type { Transform } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";
import { height } from "tailwindcss/defaultTheme";
import { useRows, type RowOperations } from "~/hooks/useRows";
import { RowManagement } from "./RowManagement";
import { Checkbox } from "~/components/ui/checkbox";
import type { Active } from "@dnd-kit/core";
import { SortControls } from "./SortControls";

interface TableMeta {
  updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  handleTabNavigation?: (
    rowId: string,
    columnId: string,
    isShiftKey: boolean,
  ) => void;
}

interface ColumnMeta {
  name: string;
  type: "text" | "number";
  isNew: (row: Row) => boolean;
}

type ColumnDefWithMeta = ColumnDef<Row, string | number> & {
  meta?: ColumnMeta;
  id: string;
};

type TableType = Table<Row>;
type HeaderType = Header<Row, string | number>;
type CellType = Cell<Row, string | number>;
type RowType = TableRow<Row>;

const BULK_ADD_ROWS_COUNT = 100;

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
  onSortingChange: (sorting: SortingState) => void;
}

// Add useSkipper hook for better pagination handling
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

interface EditableCellProps {
  getValue: () => string | number;
  row: TableRow<Row>;
  column: ColumnDef<Row, string | number>;
  table: TableType;
}

function EditableCell({ getValue, row, column, table }: EditableCellProps) {
  const initialValue = getValue();
  const [value, setValue] = useState<string | number>(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  // Reset value when the cell's actual value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    const columnDef = column as ColumnDefWithMeta;

    // Only update if value has changed
    if (value !== initialValue) {
      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.updateData) {
        tableMeta.updateData(row.index, columnDef.id, value);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onBlur();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onBlur();
      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.handleTabNavigation) {
        tableMeta.handleTabNavigation(
          row.original.id,
          (column as ColumnDefWithMeta).id,
          e.shiftKey,
        );
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setValue(initialValue); // Reset to initial value on escape
    }
  };

  if (!isEditing) {
    return (
      <div
        className="flex h-full w-full cursor-pointer items-center text-sm text-gray-900"
        onClick={() => setIsEditing(true)}
      >
        <span className="truncate">{value}</span>
      </div>
    );
  }

  return (
    <Input
      autoFocus
      value={String(value)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      type={
        (column as ColumnDefWithMeta).meta?.type === "number"
          ? "number"
          : "text"
      }
      className="h-[22px] w-full border-0 bg-white p-0 text-sm shadow-[0_0_0_2px_#166BFF] focus:ring-0"
    />
  );
}

interface SortableHeaderProps {
  header: HeaderType;
}

interface DraggableColumnProps {
  header: HeaderType;
  cells: (CellType & { isDragging: boolean })[];
  virtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, HTMLTableRowElement>
  >;
}

function DraggableColumn({ header, cells, virtualizer }: DraggableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: header.id,
      animateLayoutChanges: () => false,
    });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative" as const,
    transform: CSS.Translate.toString(transform),
    whiteSpace: "nowrap" as const,
    width: header.getSize() ?? "auto",
    zIndex: isDragging ? 1 : 0,
  };

  const isSorted = header.column.getIsSorted();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col border-r border-gray-300 bg-white",
        isDragging && "shadow-xl ring-1 ring-gray-200",
        !isDragging && "cursor-default",
        isSorted && "bg-[#FCF8F6]",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-20 border-b border-gray-300 bg-gray-50 shadow-sm",
          isSorted && "bg-[#FCF8F6]",
        )}
      >
        <div className="group flex h-8 items-center px-2 text-left text-xs font-medium text-gray-600">
          <div className="flex w-full items-center">
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "ml-1 p-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <GripVertical className="h-3 w-3 text-gray-400" />
          </button>
        </div>
      </div>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
        className={cn(isSorted && "bg-[#FFF2EA]")}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const cell = cells[virtualRow.index];
          if (!cell) {
            return (
              <div
                key={`empty-${virtualRow.index}`}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                  width: "100%",
                }}
                className="flex items-center border-b border-gray-100 px-2 py-1 text-sm text-gray-400"
              >
                —
              </div>
            );
          }

          return (
            <div
              key={cell.id}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                width: "100%",
                opacity: cell.isDragging ? 0.8 : 1,
              }}
              className={cn(
                "flex items-center border-b border-gray-300 px-2 py-1 text-sm",
                cell.isDragging && "bg-white",
                !isDragging && "hover:bg-gray-50/50",
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  updateCellAction,
  isAddingRow,
  isBatchAdding,
  sorting,
  onSortingChange,
}: EnhancedDataGridProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string | null;
    columnId: string | null;
  }>({ rowId: null, columnId: null });
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    (initialColumns ?? [])
      .sort((a, b) => a.order - b.order)
      .map((col) => col.id),
  );
  const [rowOrder, setRowOrder] = useState<Row[]>(() =>
    (initialData ?? []).sort((a, b) => a.order - b.order),
  );
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { bulkDeleteRows, isBulkDeletingRows, reorderRows } = useRows(tableId);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    return rowOrder;
  }, [rowOrder]);

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

  const columnHelper = createColumnHelper<Row>();

  const tableColumns = useMemo<ColumnDefWithMeta[]>(() => {
    return columns.map((col) => ({
      id: col.id,
      accessorFn: (row: Row) => {
        const value = row[col.name];
        return typeof value === "undefined" ? "" : value;
      },
      cell: (props) => {
        const cellProps: EditableCellProps = {
          getValue: props.getValue,
          row: props.row,
          column: props.column,
          table: props.table,
        };
        return (
          <EditableCell
            key={`${props.row.id}-${props.column.id}`}
            {...cellProps}
          />
        );
      },
      enableSorting: col.isSortable,
      meta: {
        name: col.name,
        type: col.type,
        isNew: (row: Row) => {
          return !initialData?.some((serverRow) => serverRow.id === row.id);
        },
      },
      header: ({ column }) => (
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{col.name}</span>
            {column.getCanSort() && (
              <div
                className={cn(
                  "h-4 w-4 text-gray-400",
                  column.getIsSorted() && "text-blue-600",
                )}
              >
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
          <ColumnManagement
            tableId={tableId}
            column={col}
            onColumnUpdated={() => {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.tables.detail(tableId),
              });
            }}
            onSort={(direction) => {
              if (!direction) {
                column.clearSorting();
              } else {
                column.toggleSorting(direction === "desc");
              }
            }}
            sortDirection={column.getIsSorted() as "asc" | "desc" | null}
          />
        </div>
      ),
    }));
  }, [columns, initialData, tableId]);

  function handleTabNavigation(
    currentRowId: string,
    currentColumnId: string,
    isShiftTab: boolean,
  ) {
    const currentRow = data.find((row) => row.id === currentRowId);
    const currentColumn = columns.find((col) => col.id === currentColumnId);
    const currentRowIndex = data.findIndex((row) => row.id === currentRowId);
    const currentColumnIndex = columns.findIndex(
      (col) => col.id === currentColumnId,
    );

    if (
      !currentRow ||
      !currentColumn ||
      currentRowIndex === -1 ||
      currentColumnIndex === -1
    )
      return;

    if (isShiftTab) {
      const prevColumn = columns[currentColumnIndex - 1];
      const prevRow = data[currentRowIndex - 1];
      const lastColumn = columns[columns.length - 1];

      if (currentColumnIndex > 0 && prevColumn) {
        setEditingCell({
          rowId: currentRowId,
          columnId: prevColumn.id,
        });
      } else if (currentRowIndex > 0 && prevRow && lastColumn) {
        setEditingCell({
          rowId: prevRow.id,
          columnId: lastColumn.id,
        });
      }
    } else {
      const nextColumn = columns[currentColumnIndex + 1];
      const nextRow = data[currentRowIndex + 1];
      const firstColumn = columns[0];

      if (currentColumnIndex < columns.length - 1 && nextColumn) {
        setEditingCell({
          rowId: currentRowId,
          columnId: nextColumn.id,
        });
      } else if (currentRowIndex < data.length - 1 && nextRow && firstColumn) {
        setEditingCell({
          rowId: nextRow.id,
          columnId: firstColumn.id,
        });
      }
    }
  }

  async function handleAddBulkRows() {
    void addBulkRowsAction(BULK_ADD_ROWS_COUNT);
  }

  const { reorderColumns } = useColumns(tableId);

  const table = useReactTable<Row>({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
    state: {
      sorting,
      columnOrder,
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(newSorting);
    },
    onColumnOrderChange: (updater) => {
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
    },
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        const row = data[rowIndex];
        if (!row) return;

        const column = columns.find((col) => col.id === columnId);
        if (!column) return;

        // Only update the specific cell that was edited
        const updatedRow = {
          ...row,
          [column.name]: value as string | number,
        } satisfies Row;

        // Update the local data immediately for optimistic updates
        const newData = [...data];
        newData[rowIndex] = updatedRow;
        onDataChange?.(newData);

        // Persist the change to the database
        void updateCellAction({
          rowId: row.id,
          columnId,
          value: String(value),
        }).then((result) => {
          if (!result.success) {
            // Revert the optimistic update if the server update fails
            const revertedData = [...data];
            revertedData[rowIndex] = row;
            onDataChange?.(revertedData);
            toast.error(result.error ?? "Failed to update cell");
          }
        });
      },
      handleTabNavigation: (
        rowId: string,
        columnId: string,
        isShiftKey: boolean,
      ) => {
        handleTabNavigation(rowId, columnId, isShiftKey);
      },
    } satisfies TableMeta,
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 36,
    getScrollElement: () => tableContainerRef.current,
    overscan: 5,
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

  const handleBulkDelete = async () => {
    try {
      // Update local state immediately
      handleBulkRowsDeleted(selectedRows);

      // Call server action
      await bulkDeleteRows(selectedRows);
      toast.success("Rows deleted successfully");
    } catch (error) {
      // Revert to initial data on error
      setRowOrder(initialData ?? []);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete rows",
      );
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

  return (
    <div className="flex h-full flex-col">
      <div
        ref={tableContainerRef}
        className="relative flex-1 overflow-scroll scrollbar-hide"
      >
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
          <div className="inline-flex min-w-full">
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
                      width: "69px",
                    }}
                  >
                    <div className="sticky top-0 z-20 border-b border-gray-300 bg-gray-50 shadow-sm">
                      <div className="flex h-8 items-center px-2">
                        <Checkbox
                          checked={
                            table.getRowModel().rows.length > 0 &&
                            selectedRows.length ===
                              table.getRowModel().rows.length
                          }
                          onCheckedChange={handleSelectAllRows}
                          className="ml-[14px] h-3.5 w-3.5 rounded-[4px] border-gray-300"
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
                        const row = rows[virtualRow.index];
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
                              "group flex items-center border-b border-gray-100",
                              isDragging &&
                                "bg-white shadow-xl ring-1 ring-gray-200",
                            )}
                          >
                            <RowManagement
                              tableId={tableId}
                              row={rowData}
                              isSelected={selectedRows.includes(rowData.id)}
                              onSelectionChange={(selected: boolean) =>
                                handleRowSelectionChange(rowData.id, selected)
                              }
                              onRowDeleted={handleRowDeleted}
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
                const columnCells = rows
                  .map((row) => {
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
              <ColumnManagement
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
      <div className="border-t border-gray-300 bg-white p-2">
        <div className="flex gap-2">
          {selectedRows.length > 0 ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleBulkDelete()}
                className="h-7 gap-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-600"
                disabled={isBulkDeletingRows}
              >
                {isBulkDeletingRows ? (
                  "Deleting..."
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    Delete {selectedRows.length} row
                    {selectedRows.length === 1 ? "" : "s"}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRows([])}
                className="h-7 gap-2 text-xs hover:bg-gray-50"
              >
                <X className="h-3 w-3" />
                Clear selection
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void addRowAction()}
                className="h-7 gap-2 text-xs hover:bg-gray-50"
                disabled={isAddingRow}
              >
                {isAddingRow ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    Add record
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddBulkRows}
                className="h-7 gap-2 text-xs hover:bg-gray-50"
                disabled={isBatchAdding}
              >
                {isBatchAdding
                  ? `Adding ${BULK_ADD_ROWS_COUNT} rows...`
                  : `Add ${BULK_ADD_ROWS_COUNT} rows`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
