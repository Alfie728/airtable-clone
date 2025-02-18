import type { Column, Row } from "./table";
import type { SortingState } from "@tanstack/react-table";
import type { ColumnDefWithMeta, TableType } from "./grid";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { RefObject } from "react";

export interface TableConfigProps {
  columns: Column[];
  data: Row[];
  initialData: Row[] | undefined;
  tableId: string;
  sorting: SortingState;
  columnOrder: string[];
  onSortingChangeAction: (sorting: SortingState) => void;
  onColumnOrderChange: (
    updater: string[] | ((old: string[]) => string[]),
  ) => void;
  updateCellAction: (params: {
    rowId: string;
    columnId: string;
    value: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export interface TableConfig {
  tableColumns: ColumnDefWithMeta[];
  table: TableType;
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
  tableContainerRef: RefObject<HTMLDivElement>;
}
