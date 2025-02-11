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
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useTable } from "~/hooks/useTable";
import type { Row, Column } from "~/hooks/useTable";

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

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    const columnDef = column as ColumnDefWithMeta;
    const isNewRow = columnDef.meta?.isNew?.(row.original) ?? false;

    if (isNewRow) {
      const rowId = row.original.id;
      const columnId = columnDef.id;
      const tableMeta = table.options.meta as TableMeta;
      if (tableMeta?.updateData) {
        tableMeta.updateData(row.index, columnId, value);
      }
    } else {
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

export function EnhancedDataGrid({
  baseId,
  tableId,
  initialData,
  initialColumns,
  onDataChange,
  onColumnsChange,
  addRowAction,
  addBulkRowsAction,
  updateCellAction,
  isAddingRow,
  isBatchAdding,
}: EnhancedDataGridProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string | null;
    columnId: string | null;
  }>({ rowId: null, columnId: null });
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<Column[]>(() => {
    // Use initial columns directly since we're not fetching here
    return initialColumns ?? [];
  }, [initialColumns]);

  const data = useMemo<Row[]>(() => {
    // Use initial data directly since we're not fetching here
    return initialData ?? [];
  }, [initialData]);

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  useEffect(() => {
    onColumnsChange?.(columns);
  }, [columns, onColumnsChange]);

  const columnHelper = createColumnHelper<Row>();

  // Define default column behavior
  const defaultColumn: Partial<ColumnDef<Row, string | number>> = useMemo(
    () => ({
      cell: (props) => {
        const cellProps: EditableCellProps = {
          getValue: props.getValue,
          row: props.row,
          column: props.column,
          table: props.table,
        };
        return <EditableCell {...cellProps} />;
      },
    }),
    [],
  );

  const tableColumns = useMemo<ColumnDefWithMeta[]>(() => {
    return columns.map((col) => ({
      id: col.id,
      accessorFn: (row: Row) => {
        const value = row[col.name];
        return typeof value === "undefined" ? "" : value;
      },
      meta: {
        name: col.name,
        type: col.type,
        isNew: (row: Row) => {
          if (!initialData?.some((serverRow) => serverRow.id === row.id)) {
            return false;
          }
          return !initialData.some((serverRow) => serverRow.id === row.id);
        },
      },
      header: () => (
        <div className="flex items-center gap-2">
          <span>{col.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => handleDeleteColumn(col.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    }));
  }, [columns, initialData]);

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

  const handleAddColumn = () => {
    const newColumn: Column = {
      id: crypto.randomUUID(),
      name: `Column ${columns.length + 1}`,
      type: "text",
      order: columns.length,
      width: 100,
      isSearchable: true,
      isSortable: true,
      isVisible: true,
    };

    onColumnsChange?.([...columns, newColumn]);
  };

  const handleDeleteColumn = (columnId: string) => {
    onColumnsChange?.(columns.filter((col) => col.id !== columnId));
  };

  async function handleAddBulkRows() {
    void addBulkRowsAction(BULK_ADD_ROWS_COUNT);
  }

  const table = useReactTable<Row>({
    data,
    columns: tableColumns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    meta: {
      updateData: (rowIndex: number, columnId: string, value: unknown) => {
        const row = data[rowIndex];
        if (!row) return;

        const column = columns.find((col) => col.id === columnId);
        if (!column) return;

        void updateCellAction({
          rowId: row.id,
          columnId,
          value: String(value),
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
    estimateSize: () => 33,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element: HTMLTableRowElement | null) =>
            element?.getBoundingClientRect().height ?? 33
        : undefined,
    overscan: 5,
  });

  function handleCellChange(
    rowId: string,
    columnId: string,
    value: string,
    isNewRow: boolean,
  ) {
    const rowIndex = table
      .getRowModel()
      .rows.findIndex((row) => row.original.id === rowId);
    if (rowIndex === -1) return;

    (table.options.meta as TableMeta).updateData(rowIndex, columnId, value);
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto"
        style={{
          position: "relative",
          scrollBehavior: "smooth",
        }}
      >
        <table style={{ display: "grid", width: "100%" }}>
          <thead
            style={{
              display: "grid",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                style={{ display: "flex", width: "100%" }}
                className="bg-gray-50"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      display: "flex",
                      width: header.getSize() ?? "auto",
                    }}
                    className="border-b border-r border-gray-200 px-2 py-1 text-left text-xs font-medium text-gray-600 last:border-r-0"
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        header.column.getCanSort()
                          ? "cursor-pointer select-none"
                          : ""
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
                <th className="w-10 border-b border-gray-200 px-1 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddColumn}
                    className="h-5 w-5 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </th>
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              display: "grid",
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index] as RowType;
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  style={{
                    display: "flex",
                    position: "absolute",
                    transform: `translateY(${virtualRow.start}px)`,
                    width: "100%",
                  }}
                  className="hover:bg-gray-50/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        display: "flex",
                        width: cell.column.getSize() ?? "auto",
                      }}
                      className="border-b border-r border-gray-100 px-2 py-[3px] text-sm last:border-r-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                  <td className="w-10 border-b border-gray-100" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 bg-white p-2">
        <div className="flex gap-2">
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
        </div>
      </div>
    </div>
  );
}
