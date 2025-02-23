import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";
import type { Column } from "~/types/table";

export function useTableSearch(columns: Column[] = []) {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 500);

  // Reset search value when columns change (e.g., during loading)
  useEffect(() => {
    if (columns.length === 0) {
      setSearchValue("");
    }
  }, [columns]);

  // Get searchable columns
  const searchableColumns = columns.filter((col) => col.isSearchable);

  return {
    searchValue,
    setSearchValue,
    debouncedSearchValue,
    searchableColumns,
  };
}
