import { useState, useCallback } from "react";
import { type SortingState } from "@tanstack/react-table";
import type { Column } from "~/types/table";
import type { FilterPreference } from "~/types/filter";
import { Button } from "~/components/ui/button";
import {
  Menu,
  Filter,
  Grid,
  Eye,
  ChevronDown,
  Plus,
  X,
  HelpCircle,
} from "lucide-react";
import { UserGroupsIcon } from "~/components/Icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface GridControlsProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  columns?: Column[];
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  filtering?: FilterPreference[];
  onFilteringChange?: (filtering: FilterPreference[]) => void;
}

export function GridControls({
  isSidebarOpen,
  onToggleSidebar,
  columns = [],
  sorting = [],
  onSortingChange = () => void 0,
  filtering = [],
  onFilteringChange = () => void 0,
}: GridControlsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [addFilterOpen, setAddFilterOpen] = useState(false);

  const handleAddFilter = useCallback(
    (columnId: string) => {
      const newFiltering = [...filtering];
      const newFilter: FilterPreference = {
        id: crypto.randomUUID(),
        columnId,
        operator: "contains",
        value: "",
        order: newFiltering.length,
      };
      newFiltering.push(newFilter);
      onFilteringChange(newFiltering);
      setAddFilterOpen(false);
    },
    [filtering, onFilteringChange],
  );

  const handleRemoveFilter = useCallback(
    (filterId: string) => {
      const newFiltering = filtering.filter((filter) => filter.id !== filterId);
      onFilteringChange(newFiltering);
    },
    [filtering, onFilteringChange],
  );

  const handleChangeFilterColumn = useCallback(
    (filterId: string, newColumnId: string) => {
      const newFiltering = filtering.map((filter) => {
        if (filter.id === filterId) {
          return { ...filter, columnId: newColumnId };
        }
        return filter;
      });
      onFilteringChange(newFiltering);
    },
    [filtering, onFilteringChange],
  );

  const handleChangeFilterOperator = useCallback(
    (filterId: string, newOperator: FilterPreference["operator"]) => {
      const newFiltering = filtering.map((filter) => {
        if (filter.id === filterId) {
          return { ...filter, operator: newOperator };
        }
        return filter;
      });
      onFilteringChange(newFiltering);
    },
    [filtering, onFilteringChange],
  );

  const handleChangeFilterValue = useCallback(
    (filterId: string, newValue: string) => {
      const newFiltering = filtering.map((filter) => {
        if (filter.id === filterId) {
          return { ...filter, value: newValue };
        }
        return filter;
      });
      onFilteringChange(newFiltering);
    },
    [filtering, onFilteringChange],
  );

  const filterableColumns = columns.filter((col) => col.isSearchable);

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

        <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 rounded px-2 text-sm font-normal",
                filtering.length > 0
                  ? "bg-[#FFE0CC] text-gray-700 hover:border-rose-200 hover:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.1)]"
                  : "text-gray-700",
              )}
            >
              <Filter className="h-4 w-4" />
              {filtering.length === 0
                ? "Filter"
                : `${filtering.length} ${
                    filtering.length === 1 ? "filter" : "filters"
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
                <h3 className="text-sm font-medium">Filter by</h3>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <HelpCircle className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setFilterOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {filtering.map((filter, index) => {
                const column = columns.find(
                  (col) => col.id === filter.columnId,
                );
                if (!column) return null;

                return (
                  <div
                    key={filter.id}
                    className="flex flex-col gap-2 rounded-md border border-gray-200 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center text-xs text-blue-600">
                        {index + 1}
                      </div>
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
                        <DropdownMenuContent
                          align="start"
                          className="w-[200px]"
                        >
                          {filterableColumns.map((col) => (
                            <DropdownMenuItem
                              key={col.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleChangeFilterColumn(filter.id, col.id);
                              }}
                            >
                              {col.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 justify-between gap-2 text-xs"
                          >
                            {filter.operator.replace("_", " ")}
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-[200px]"
                        >
                          {[
                            "equals",
                            "not_equals",
                            "contains",
                            "not_contains",
                            "greater_than",
                            "less_than",
                            "is_empty",
                            "is_not_empty",
                          ].map((op) => (
                            <DropdownMenuItem
                              key={op}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleChangeFilterOperator(
                                  filter.id,
                                  op as FilterPreference["operator"],
                                );
                              }}
                            >
                              {op.replace("_", " ")}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFilter(filter.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {!["is_empty", "is_not_empty"].includes(
                      filter.operator,
                    ) && (
                      <Input
                        value={filter.value}
                        onChange={(e) =>
                          handleChangeFilterValue(filter.id, e.target.value)
                        }
                        placeholder="Enter a value"
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {filtering.length === 0 ? (
              <div className="space-y-1">
                {filterableColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddFilter(column.id);
                    }}
                    className="h-7 text-xs"
                  >
                    {column.name}
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <DropdownMenu
                open={addFilterOpen}
                onOpenChange={setAddFilterOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 gap-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add another filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {filterableColumns.map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddFilter(column.id);
                      }}
                      className="h-7 text-xs"
                    >
                      {column.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
