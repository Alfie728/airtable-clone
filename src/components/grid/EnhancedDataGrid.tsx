"use client";

import { useEffect, useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useTable } from "~/hooks/useTable";
import debounce from "lodash/debounce";
import type { Row, Column } from "~/hooks/useTable";

const BULK_ADD_ROWS_COUNT = 5000;

interface EnhancedDataGridProps {
  tableId: string;
  initialData?: Row[];
  initialColumns?: Column[];
  onDataChange?: (data: Row[]) => void;
  onColumnsChange?: (columns: Column[]) => void;
}

export function EnhancedDataGrid({
  tableId,
  initialData,
  initialColumns,
  onDataChange,
  onColumnsChange,
}: EnhancedDataGridProps) {
  const [data, setData] = useState<Row[]>(() => initialData ?? []);
  const [columns, setColumns] = useState<Column[]>(() => initialColumns ?? []);

  const [editingCell, setEditingCell] = useState<{
    rowId: string | null;
    columnId: string | null;
  }>({ rowId: null, columnId: null });

  const {
    tableData,
    isLoading,
    error,
    addRow,
    addBulkRows,
    updateCell,
    isAddingRow,
    isBatchAdding,
  } = useTable(tableId, tableId);

  // Create a debounced update function
  const debouncedUpdateCell = useMemo(
    () =>
      debounce(
        (params: { rowId: string; columnId: string; value: string }) => {
          void updateCell(params);
        },
        500,
        { leading: false },
      ),
    [updateCell],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedUpdateCell.cancel();
    };
  }, [debouncedUpdateCell]);

  useEffect(() => {
    if (tableData) {
      setData(tableData.data);
      setColumns(tableData.columns);
    }
  }, [tableData]);

  const columnHelper = createColumnHelper<Row>();

  const tableColumns = columns.map((col) =>
    columnHelper.accessor(
      (row: Row) => {
        const value = row[col.name];
        return typeof value === "undefined" ? "" : value;
      },
      {
        id: col.id,
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
        cell: (info) => {
          const value = info.getValue();
          const isEditing =
            editingCell.rowId === info.row.original.id &&
            editingCell.columnId === col.id;

          if (isEditing) {
            return (
              <Input
                autoFocus
                value={value as string}
                onChange={(e) =>
                  handleCellChange(info.row.original.id, col.id, e.target.value)
                }
                onBlur={() => setEditingCell({ rowId: null, columnId: null })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingCell({ rowId: null, columnId: null });
                  } else if (e.key === "Tab") {
                    e.preventDefault();
                    handleTabNavigation(
                      info.row.original.id,
                      col.id,
                      e.shiftKey,
                    );
                  }
                }}
                type={col.type === "number" ? "number" : "text"}
                className="h-8"
              />
            );
          }

          return (
            <div
              className="cursor-pointer p-2"
              onClick={() =>
                setEditingCell({
                  rowId: info.row.original.id,
                  columnId: col.id,
                })
              }
            >
              {value}
            </div>
          );
        },
      },
    ),
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    onDataChange?.(data);
  }, [data, onDataChange]);

  useEffect(() => {
    onColumnsChange?.(columns);
  }, [columns, onColumnsChange]);

  async function handleAddRow() {
    addRow();
  }

  async function handleCellChange(
    rowId: string,
    columnId: string,
    value: string,
  ) {
    await updateCell({ rowId, columnId, value });
  }

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

  function handleAddColumn() {
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
    setColumns([...columns, newColumn]);
    setData((prev) =>
      prev.map((row) => ({
        ...row,
        [newColumn.name]: "",
      })),
    );
  }

  function handleDeleteColumn(columnId: string) {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;

    setColumns(columns.filter((c) => c.id !== columnId));
    setData((prev) =>
      prev.map((row) => {
        const { [column.name]: _, ...rest } = row;
        return { id: row.id, ...rest };
      }),
    );
  }

  async function handleAddBulkRows() {
    void addBulkRows(BULK_ADD_ROWS_COUNT);
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-red-500">
              {error instanceof Error
                ? error.message
                : "Error loading table data"}
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-r p-2 text-left font-medium text-gray-600 last:border-r-0"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                  <th className="w-10 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </th>
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-r p-0 last:border-r-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                  <td className="w-10" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleAddRow()}
          className="gap-2"
          disabled={isAddingRow}
        >
          {isAddingRow ? (
            "Adding..."
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add row
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleAddBulkRows()}
          className="ml-2 gap-2"
          disabled={isBatchAdding}
        >
          {isBatchAdding ? (
            `Adding ${BULK_ADD_ROWS_COUNT} rows...`
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add {BULK_ADD_ROWS_COUNT} rows
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// function generateRow(columns: Column[]): Row {
//   const row: Row = { id: crypto.randomUUID() };
//   columns.forEach((column) => {
//     if (column.type === "text") {
//       switch (column.name.toLowerCase()) {
//         case "name":
//           row[column.name] = faker.person.fullName();
//           break;
//         case "city":
//           row[column.name] = faker.location.city();
//           break;
//         default:
//           row[column.name] = faker.lorem.word();
//       }
//     } else if (column.type === "number") {
//       switch (column.name.toLowerCase()) {
//         case "age":
//           row[column.name] = faker.number.int({ min: 18, max: 80 });
//           break;
//         default:
//           row[column.name] = faker.number.int({ min: 0, max: 100 });
//       }
//     }
//   });
//   return row;
// }
