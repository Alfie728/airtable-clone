import { useState, useCallback, useEffect } from "react";
import { Filter, ChevronDown, Plus, X, HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import type { Column } from "~/types/table";
import type { FilterPreference } from "~/types/filter";
import { useDebounce } from "~/hooks/useDebounce";

interface FilterDropdownProps {
  columns: Column[];
  filtering: FilterPreference[];
  onFilteringChange: (filtering: FilterPreference[]) => void;
}

export function FilterDropdown({
  columns,
  filtering,
  onFilteringChange,
}: FilterDropdownProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const filterableColumns = columns.filter((col) => col.isSearchable);

  // Filter out search filters
  const nonSearchFilters = filtering.filter(
    (filter) => !filter.id.startsWith("search-"),
  );

  const debouncedInputValues = useDebounce(inputValues, 500);

  // Effect to update filter values when debounced input changes
  useEffect(() => {
    const updatedFiltering = filtering.map((filter) => ({
      ...filter,
      value: debouncedInputValues[filter.id] ?? filter.value,
    }));

    if (JSON.stringify(updatedFiltering) !== JSON.stringify(filtering)) {
      onFilteringChange(updatedFiltering);
    }
  }, [debouncedInputValues, filtering, onFilteringChange]);

  const operators: FilterPreference["operator"][] = [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
  ];

  const handleToggleOperator = useCallback(
    (filterId: string) => {
      setOperatorOpen(operatorOpen === filterId ? null : filterId);
    },
    [operatorOpen],
  );

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
      setInputValues((prev) => ({
        ...prev,
        [filterId]: newValue,
      }));
    },
    [],
  );

  return (
    <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded px-2 text-sm font-normal",
            nonSearchFilters.length > 0
              ? "bg-[#FFE0CC] text-gray-700 hover:border-rose-200 hover:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.1)]"
              : "text-gray-700 hover:bg-gray-100",
          )}
        >
          <Filter className="h-4 w-4" />
          {nonSearchFilters.length === 0
            ? "Filter"
            : `${nonSearchFilters.length} ${nonSearchFilters.length === 1 ? "filter" : "filters"}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[600px] p-4"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">
              In this view, show records where
            </h3>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              <HelpCircle className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {nonSearchFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-500 hover:text-gray-900"
                onClick={() => {
                  // Preserve search filters when clearing
                  const searchFilters = filtering.filter((f) =>
                    f.id.startsWith("search-"),
                  );
                  onFilteringChange(searchFilters);
                }}
              >
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setFilterOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {nonSearchFilters.length === 0 ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              No filter conditions are applied
            </div>
            <DropdownMenu open={addFilterOpen} onOpenChange={setAddFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-2 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-3 w-3" />
                  Add condition
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[200px]"
                side="right"
                sideOffset={10}
              >
                {filterableColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={() => handleAddFilter(column.id)}
                    className="h-7 text-xs"
                  >
                    {column.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="space-y-2">
            {nonSearchFilters.map((filter, index) => {
              const column = columns.find((col) => col.id === filter.columnId);
              if (!column) return null;

              return (
                <div key={filter.id} className="flex items-center gap-2">
                  <span className="text-xs text-blue-600">
                    {index === 0 ? "Where" : "And"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[120px] justify-between gap-2 border border-gray-200 text-xs"
                      >
                        {column.name}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {filterableColumns.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() =>
                            handleChangeFilterColumn(filter.id, col.id)
                          }
                          className="h-7 text-xs"
                        >
                          {col.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[120px] justify-between gap-2 border border-gray-200 text-xs"
                      >
                        {filter.operator.replace("_", " ")}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[200px]">
                      {operators.map((op) => (
                        <DropdownMenuItem
                          key={op}
                          onClick={() =>
                            handleChangeFilterOperator(filter.id, op)
                          }
                          className="h-7 text-xs"
                        >
                          {op.replace("_", " ")}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {!["is_empty", "is_not_empty"].includes(filter.operator) && (
                    <Input
                      value={inputValues[filter.id] ?? filter.value}
                      onChange={(e) =>
                        handleChangeFilterValue(filter.id, e.target.value)
                      }
                      placeholder="Enter a value"
                      className="h-8 min-w-[200px] text-xs"
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-400 hover:bg-gray-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveFilter(filter.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}

            <DropdownMenu open={addFilterOpen} onOpenChange={setAddFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-2 text-xs text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-3 w-3" />
                  Add another condition
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[200px]"
                side="right"
                sideOffset={10}
              >
                {filterableColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.id}
                    onClick={() => handleAddFilter(column.id)}
                    className="h-7 text-xs"
                  >
                    {column.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 text-xs text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3" />
            Add condition group
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-50"
          >
            <HelpCircle className="h-3 w-3" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
