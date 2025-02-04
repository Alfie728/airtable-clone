"use client";

import { ChevronDown, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useState } from "react";

interface DataGridProps {
  data: {
    id: number;
    name: string;
    email: string;
    notes: string;
    date: string;
    status: string;
  }[];
}

export function DataGrid({ data: initialData }: DataGridProps) {
  const [data, setData] = useState(initialData);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: number | null;
    colId: string | null;
  }>({
    rowId: null,
    colId: null,
  });

  const handleCellClick = (rowId: number, colId: string) => {
    setSelectedCell({ rowId, colId });
  };

  const handleCellChange = (rowId: number, colId: string, value: string) => {
    const newData = data.map((row) =>
      row.id === rowId ? { ...row, [colId]: value } : row,
    );
    setData(newData);
  };

  return (
    <div className="rounded border">
      {/* Header */}
      <div className="grid grid-cols-5 border-b bg-gray-50 text-sm font-medium text-gray-600">
        <div className="flex items-center gap-2 border-r p-2">
          <input type="checkbox" className="rounded border-gray-300" />
          Name
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 border-r p-2">
          Email
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 border-r p-2">
          Notes
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 border-r p-2">
          Date
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 p-2">
          Status
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {/* Rows */}
      {data.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-5 border-b hover:bg-blue-50/50"
        >
          <div className="flex items-center border-r p-2">
            <div className="mr-2">{row.name}</div>
          </div>
          <div className="border-r p-2">{row.email}</div>
          <div className="border-r p-2">{row.notes}</div>
          <div className="border-r p-2">{row.date}</div>
          <div className="p-2">{row.status}</div>
        </div>
      ))}

      {/* Add Row */}
      <div className="grid grid-cols-5">
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
