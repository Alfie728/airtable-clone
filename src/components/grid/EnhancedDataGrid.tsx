"use client";

import { useEffect, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Plus, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { faker } from "@faker-js/faker";

interface Column {
  id: string;
  name: string;
  type: "text" | "number";
}

interface Row {
  id: string;
  [key: string]: string | number;
}

interface EnhancedDataGridProps {
  initialData?: Row[];
  initialColumns?: Column[];
  onDataChange?: (data: Row[]) => void;
  onColumnsChange?: (columns: Column[]) => void;
}

export function EnhancedDataGrid({
  initialData,
  initialColumns,
  onDataChange,
  onColumnsChange,
}: EnhancedDataGridProps) {
  const [data, setData] = useState<Row[]>(() => {
    if (initialData && initialData.length > 0) return initialData;
    return generateDefaultRows(initialColumns || generateDefaultColumns());
  });

  const [columns, setColumns] = useState<Column[]>(() => {
    if (initialColumns && initialColumns.length > 0) return initialColumns;
    return generateDefaultColumns();
  });

  const [editingCell, setEditingCell] = useState<{
    rowId: string | null;
    columnId: string | null;
  }>({ rowId: null, columnId: null });

  const columnHelper = createColumnHelper<Row>();

  const tableColumns = columns.map((col) =>
    columnHelper.accessor(col.name as any, {
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
                  handleTabNavigation(info.row.original.id, col.id, e.shiftKey);
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
    }),
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

  function handleCellChange(rowId: string, columnId: string, value: string) {
    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const column = columns.find((c) => c.id === columnId);
          const newValue =
            column?.type === "number" ? Number(value) || 0 : value;
          return {
            ...row,
            [column?.name || ""]: newValue,
          };
        }
        return row;
      }),
    );
  }

  function handleTabNavigation(
    currentRowId: string,
    currentColumnId: string,
    isShiftTab: boolean,
  ) {
    const currentRowIndex = data.findIndex((row) => row.id === currentRowId);
    const currentColumnIndex = columns.findIndex(
      (col) => col.id === currentColumnId,
    );

    if (isShiftTab) {
      // Move backwards
      if (currentColumnIndex > 0) {
        setEditingCell({
          rowId: currentRowId,
          columnId: columns[currentColumnIndex - 1].id,
        });
      } else if (currentRowIndex > 0) {
        setEditingCell({
          rowId: data[currentRowIndex - 1].id,
          columnId: columns[columns.length - 1].id,
        });
      }
    } else {
      // Move forwards
      if (currentColumnIndex < columns.length - 1) {
        setEditingCell({
          rowId: currentRowId,
          columnId: columns[currentColumnIndex + 1].id,
        });
      } else if (currentRowIndex < data.length - 1) {
        setEditingCell({
          rowId: data[currentRowIndex + 1].id,
          columnId: columns[0].id,
        });
      }
    }
  }

  function handleAddColumn() {
    const newColumn: Column = {
      id: crypto.randomUUID(),
      name: `Column ${columns.length + 1}`,
      type: "text",
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
    setData((prev) => prev.map(({ [column.name]: _, ...rest }) => rest));
  }

  function handleAddRow() {
    const newRow = generateRow(columns);
    setData([...data, newRow]);
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-auto">
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="w-10" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddRow}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add row
        </Button>
      </div>
    </div>
  );
}

function generateDefaultColumns(): Column[] {
  return [
    { id: crypto.randomUUID(), name: "Name", type: "text" },
    { id: crypto.randomUUID(), name: "Age", type: "number" },
    { id: crypto.randomUUID(), name: "City", type: "text" },
  ];
}

function generateRow(columns: Column[]): Row {
  const row: Row = { id: crypto.randomUUID() };
  columns.forEach((column) => {
    if (column.type === "text") {
      switch (column.name.toLowerCase()) {
        case "name":
          row[column.name] = faker.person.fullName();
          break;
        case "city":
          row[column.name] = faker.location.city();
          break;
        default:
          row[column.name] = faker.lorem.word();
      }
    } else if (column.type === "number") {
      switch (column.name.toLowerCase()) {
        case "age":
          row[column.name] = faker.number.int({ min: 18, max: 80 });
          break;
        default:
          row[column.name] = faker.number.int({ min: 0, max: 100 });
      }
    }
  });
  return row;
}

function generateDefaultRows(columns: Column[]): Row[] {
  return Array.from({ length: 5 }, () => generateRow(columns));
}
