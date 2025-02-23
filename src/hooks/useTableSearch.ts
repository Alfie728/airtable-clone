import { useState, useEffect } from "react";
import { useDebounce } from "./useDebounce";
import type { Column } from "~/types/table";

export function useTableSearch(columns: Column[]) {
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, 500);

  // Get searchable columns
  const searchableColumns = columns.filter((col) => col.isSearchable);

  return {
    searchValue,
    setSearchValue,
    debouncedSearchValue,
    searchableColumns,
  };
}
