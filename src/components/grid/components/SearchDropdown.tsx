import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import type { Column } from "~/types/table";
import type { FilterPreference } from "~/types/filter";
import { useDebounce } from "~/hooks/useDebounce";

interface SearchDropdownProps {
  columns: Column[];
  filtering: FilterPreference[];
  onFilteringChange: (filtering: FilterPreference[]) => void;
}

const SearchDropdown = ({
  columns,
  filtering,
  onFilteringChange,
}: SearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 500);

  // Use ref to track the last applied search term to prevent unnecessary updates
  const lastAppliedSearchRef = useRef("");

  // Initialize search value from filters on mount
  useEffect(() => {
    const searchFilter = filtering.find((f) => f.id.startsWith("search-"));
    if (searchFilter && !searchValue) {
      setSearchValue(searchFilter.value);
      lastAppliedSearchRef.current = searchFilter.value;
    }
  }, []); // Run only on mount

  // Handle search updates
  useEffect(() => {
    // Skip if the search term hasn't changed
    if (debouncedSearchValue === lastAppliedSearchRef.current) {
      return;
    }

    // Update the last applied search term
    lastAppliedSearchRef.current = debouncedSearchValue;

    // Get non-search filters
    const nonSearchFilters = filtering.filter(
      (filter) => !filter.id.startsWith("search-"),
    );

    // If no search term, just remove search filters
    if (!debouncedSearchValue) {
      onFilteringChange(nonSearchFilters);
      return;
    }

    // Get searchable columns
    const searchableColumns = columns.filter((col) => col.isSearchable);

    // Create search filters
    const searchFilters = searchableColumns.map((column, index) => ({
      id: `search-${column.id}`,
      columnId: column.id,
      operator: "contains" as const,
      value: debouncedSearchValue,
      order: nonSearchFilters.length + index,
    }));

    // Update filters
    onFilteringChange([...nonSearchFilters, ...searchFilters]);
  }, [debouncedSearchValue, columns, filtering, onFilteringChange]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px] p-0" align="start">
        <div className="flex items-center px-2 py-2">
          <Search className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <Input
            placeholder="Find in view"
            className="h-8 border-none px-0 shadow-none focus-visible:ring-0"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => {
              setSearchValue("");
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="border-t px-2 py-2 text-xs text-muted-foreground">
          Use advanced search options in the search extension.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SearchDropdown;
