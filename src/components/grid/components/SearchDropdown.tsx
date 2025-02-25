import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { Column } from "~/types/table";
import { cn } from "~/lib/utils";
import { useTableSearch } from "~/hooks/useTableSearch";

interface SearchDropdownProps {
  columns: Column[];
  onSearch: (value: string) => void;
}

const SearchDropdown = ({ columns, onSearch }: SearchDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { searchValue, setSearchValue, debouncedSearchValue } =
    useTableSearch(columns);

  // Effect to propagate search changes
  useEffect(() => {
    onSearch(debouncedSearchValue);
  }, [debouncedSearchValue, onSearch]);

  // Handle clearing the search
  const handleClear = () => {
    setSearchValue("");
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 rounded px-2 text-sm font-normal",
            searchValue
              ? "bg-[#ffd66b] text-gray-700 hover:shadow-[inset_0px_0px_0px_2px_rgba(0,0,0,0.1)]"
              : "text-gray-700 hover:bg-gray-100",
          )}
        >
          <Search className="h-4 w-4" />
          {searchValue && (
            <span className="max-w-[100px] truncate">{searchValue}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[300px] p-0"
        align="start"
        sideOffset={0}
      >
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
            onClick={handleClear}
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
