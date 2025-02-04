"use client";

import { ChevronDown, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState } from "react";

interface DataGridProps {
  data: Record<string, string | number>[];
}

export function DataGrid({ data: initialData }: DataGridProps) {
  const [data, setData] = useState(initialData);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string | null;
    colId: string | null;
  }>({
    rowId: null,
    colId: null,
  });

  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  const firstRow = data[0];
  if (!firstRow) {
    return <div>No data available</div>;
  }

  // Get column names from the first row
  const columnNames = Object.keys(firstRow).filter((key) => key !== "id");

  const handleCellClick = (rowId: string, colId: string) => {
    setSelectedCell({ rowId, colId });
  };

  const handleCellChange = (rowId: string, colId: string, value: string) => {
    const newData = data.map((row) =>
      row.id === rowId ? { ...row, [colId]: value } : row,
    );
    setData(newData);
  };

  return (
    <div className="rounded border">
      {/* Header */}
      <div
        className="grid border-b bg-gray-50 text-sm font-medium text-gray-600"
        style={{
          gridTemplateColumns: `repeat(${columnNames.length}, minmax(200px, 1fr))`,
        }}
      >
        {columnNames.map((columnName) => (
          <div
            key={columnName}
            className="flex items-center gap-2 border-r p-2"
          >
            <input type="checkbox" className="rounded border-gray-300" />
            {columnName
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
            <ChevronDown className="h-4 w-4" />
          </div>
        ))}
      </div>

      {/* Rows */}
      {data.map((row) => (
        <div
          key={row.id}
          className="grid border-b hover:bg-blue-50/50"
          style={{
            gridTemplateColumns: `repeat(${columnNames.length}, minmax(200px, 1fr))`,
          }}
        >
          {columnNames.map((columnName, index) => (
            <div
              key={`${row.id}-${columnName}`}
              className={`p-2 ${index < columnNames.length - 1 ? "border-r" : ""}`}
            >
              {row[columnName]}
            </div>
          ))}
        </div>
      ))}

      {/* Add Row */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columnNames.length}, minmax(200px, 1fr))`,
        }}
      >
        <div className="flex items-center p-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add...
          </Button>
        </div>
      </div>
    </div>
  );
}
