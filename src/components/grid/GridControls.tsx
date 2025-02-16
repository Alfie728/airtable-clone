"use client";

import {
  Filter,
  Group,
  SortAsc,
  Palette,
  Menu,
  Share2,
  Search,
  ChevronDown,
  Eye,
  Grid,
  Plus,
  X,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { UserGroupsIcon, RowHeightIcon } from "~/components/Icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import type { Column } from "~/types/table";
import type { SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface GridControlsProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  columns?: Column[];
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

export function GridControls({
  isSidebarOpen,
  onToggleSidebar,
  columns = [],
  sorting = [],
  onSortingChange = (newSorting: SortingState) => {
    // noop
  },
}: GridControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoSort, setAutoSort] = useState(true);

  const handleAddSort = (columnId: string) => {
    const newSorting = [...sorting];
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

  const handleChangeSort = (oldColumnId: string, newColumnId: string) => {
    const newSorting = sorting.map((sort) => {
      if (sort.id === oldColumnId) {
        return { ...sort, id: newColumnId };
      }
      return sort;
    });
    onSortingChange(newSorting);
  };

  const sortableColumns = columns.filter((col) => col.isSortable);

  return (
    <div className="flex h-12 items-center gap-2 border-b border-gray-200 bg-white px-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        onClick={onToggleSidebar}
      >
        <Menu className="h-4 w-4" />
        Views
      </Button>
      <div className="h-4 w-px bg-gray-200" />
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Grid className="h-4 w-4" />
          Grid view
          <UserGroupsIcon className="h-4 w-4" />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Eye className="h-4 w-4" />
          Hide fields
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Filter className="h-4 w-4" />
          Filter
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Group className="h-4 w-4" />
          Group
        </Button>

        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded px-2 text-sm font-normal",
                sorting.length > 0
                  ? "bg-[#FFE0CC] text-gray-700 hover:border-rose-200 hover:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.1)]"
                  : "text-gray-700",
              )}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sorting.length === 0
                ? "Sort"
                : `Sorted by ${sorting.length} ${
                    sorting.length === 1 ? "field" : "fields"
                  }`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[400px] p-4"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Sort by</h3>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
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
              {sorting.map((sort) => {
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
                        {sortableColumns
                          .filter(
                            (col) =>
                              !sorting.some((s) => s.id === col.id) ||
                              col.id === sort.id,
                          )
                          .map((col) => (
                            <DropdownMenuItem
                              key={col.id}
                              onSelect={() => handleChangeSort(sort.id, col.id)}
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

            {sorting.length === 0 ? (
              <div className="space-y-1">
                {sortableColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={() => handleAddSort(column.id)}
                    className="h-7 text-xs"
                  >
                    {column.name}
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add another sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {sortableColumns
                    .filter(
                      (col) => !sorting.some((sort) => sort.id === col.id),
                    )
                    .map((column) => (
                      <DropdownMenuItem
                        key={column.id}
                        onSelect={() => handleAddSort(column.id)}
                        className="h-7 text-xs"
                      >
                        {column.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Palette className="h-4 w-4" />
          Color
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <RowHeightIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
        >
          <Share2 className="h-4 w-4" />
          Share and sync
        </Button>
      </div>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 rounded px-2 text-sm font-normal text-gray-700 hover:bg-gray-100"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
