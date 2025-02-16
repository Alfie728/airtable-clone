import { useState } from "react";
import { ChevronDown, Plus, X, ArrowUpDown, HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import type { Column } from "~/types/table";
import type { SortingState } from "@tanstack/react-table";

interface SortControlsProps {
  columns: Column[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function SortControls({
  columns,
  sorting,
  onSortingChange,
}: SortControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoSort, setAutoSort] = useState(true);

  const handleAddSort = (columnId: string) => {
    const newSorting = [...sorting];
    // Only add if not already in sorting
    if (!newSorting.find((sort) => sort.id === columnId)) {
      newSorting.push({ id: columnId, desc: false });
      onSortingChange(newSorting);
    }
    setIsOpen(false);
  };

  const handleRemoveSort = (columnId: string) => {
    const newSorting = sorting.filter((sort) => sort.id !== columnId);
    onSortingChange(newSorting);
  };

  const handleToggleSortDirection = (columnId: string) => {
    const newSorting = sorting.map((sort) => {
      if (sort.id === columnId) {
        return { ...sort, desc: !sort.desc };
      }
      return sort;
    });
    onSortingChange(newSorting);
  };

  const sortableColumns = columns.filter((col) => col.isSortable);

  if (sorting.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-xs hover:bg-gray-50"
          >
            <ArrowUpDown className="h-3 w-3" />
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {sortableColumns.map((column) => (
            <DropdownMenuItem
              key={column.id}
              onSelect={() => handleAddSort(column.id)}
            >
              {column.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="h-8 gap-2 bg-rose-50 text-xs hover:bg-rose-100"
      >
        <ArrowUpDown className="h-3 w-3" />
        Sorted by {sorting.length} {sorting.length === 1 ? "field" : "fields"}
      </Button>

      <div className="relative">
        <div className="absolute left-0 top-full z-50 mt-1 w-[400px] rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Sort by</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => {}}
              >
                <HelpCircle className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-2">
            {sorting.map((sort, index) => {
              const column = columns.find((col) => col.id === sort.id);
              if (!column) return null;

              return (
                <div
                  key={sort.id}
                  className="flex items-center gap-2 rounded-md border border-gray-200 p-2"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 justify-between gap-2 text-xs"
                      >
                        {column.name}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {sortableColumns.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onSelect={() => handleAddSort(col.id)}
                        >
                          {col.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-2 text-xs"
                    onClick={() => handleToggleSortDirection(sort.id)}
                  >
                    {sort.desc ? "Z → A" : "A → Z"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleRemoveSort(sort.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 gap-2 text-xs"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="h-3 w-3" />
            Add another sort
          </Button>

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoSort}
                onCheckedChange={setAutoSort}
                className="h-[18px] w-[32px]"
              />
              <span className="text-sm">Automatically sort records</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
