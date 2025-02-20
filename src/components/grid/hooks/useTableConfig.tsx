"use client";

import { useMemo, useRef } from "react";
import type {
  CellContext,
  HeaderContext,
  SortingState,
  ColumnDef,
  FilterFn,
  FilterFnOption,
  ColumnFiltersState,
  Column as TableColumn,
} from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Row, Column } from "~/types/table";
import type { TableConfigProps, TableConfig } from "~/types/table-config";
import type { ColumnDefWithMeta, ColumnMeta, TableType } from "~/types/grid";
import { useQueryClient } from "@tanstack/react-query";
import { GridCell } from "../components/GridCell";
import { GridHeader } from "../components/GridHeader";
import type { FilterPreference } from "~/types/filter";

interface ExtendedTableConfigProps extends TableConfigProps {
  filtering: FilterPreference[];
  onFilteringChange: (filtering: FilterPreference[]) => void;
}

const useTableConfig = ({
  columns,
  data,
  initialData,
  tableId,
  sorting,
  filtering,
  columnOrder,
  onSortingChangeAction,
  onFilteringChange,
  onColumnOrderChange,
  updateCellAction,
}: ExtendedTableConfigProps): TableConfig => {
  const queryClient = useQueryClient();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const tableColumns = useMemo<ColumnDefWithMeta[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorKey: col.id,
        sortingFn: "alphanumeric" as const,
        cell: (props: CellContext<Row, string | number>) => {
          return <GridCell context={props} initialData={initialData} />;
        },
        enableSorting: col.isSortable,
        meta: {
          name: col.name,
          type: col.type,
          isNew: (row: Row) => {
            return !initialData?.some((serverRow) => serverRow.id === row.id);
          },
        } as ColumnMeta,
        header: (props: HeaderContext<Row, string | number>) => (
          <GridHeader
            column={col}
            headerContext={props}
            tableId={tableId}
            queryClient={queryClient}
          />
        ),
      })),
    [columns, initialData, queryClient, tableId],
  );

  const filterFn = (
    row: Row,
    columnId: string,
    filterValue: string,
    operator: string,
  ) => {
    const value = String(row[columnId] ?? "");
    if (!value && value !== "") return false;

    switch (operator) {
      case "equals":
        return value === filterValue;
      case "not_equals":
        return value !== filterValue;
      case "contains":
        return value.toLowerCase().includes(filterValue.toLowerCase());
      case "not_contains":
        return !value.toLowerCase().includes(filterValue.toLowerCase());
      case "greater_than":
        return Number(value) > Number(filterValue);
      case "less_than":
        return Number(value) < Number(filterValue);
      case "is_empty":
        return !value;
      case "is_not_empty":
        return Boolean(value);
      default:
        return true;
    }
  };

  const customFilterFn: FilterFn<Row> = (
    row,
    columnId,
    filterValue: { value: string; operator: string },
  ) => {
    return filterFn(
      row.original,
      columnId,
      filterValue.value,
      filterValue.operator,
    );
  };

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    // getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    manualFiltering: true,
    isMultiSortEvent: () => true,
    enableMultiSort: true,
    sortDescFirst: false,
    state: {
      sorting,
      columnOrder,
      columnFilters: filtering.map((f) => ({
        id: f.columnId,
        value: { value: f.value, operator: f.operator },
      })),
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;

      // For direct array updates (from GridControls)
      if (Array.isArray(updater)) {
        onSortingChangeAction(updater);
        return;
      }

      // For function updates (from ColumnManagement)
      if (typeof updater === "function") {
        const updatedSorting = updater(sorting);
        // For adding/updating sort
        if (updatedSorting.length === 1 && updatedSorting[0]) {
          const newSortItem = updatedSorting[0];
          const existingSort = sorting.find((s) => s.id === newSortItem.id);

          if (existingSort) {
            // Update existing sort
            const newSorting = sorting
              .map((s) => (s.id === newSortItem.id ? newSortItem : s))
              .filter((s): s is typeof newSortItem => s !== undefined);
            onSortingChangeAction(newSorting);
          } else {
            // Add new sort
            onSortingChangeAction([...sorting, newSortItem]);
          }
          return;
        }
      }

      // Default: use the new sorting as is
      onSortingChangeAction(newSorting);
    },
    onColumnOrderChange: onColumnOrderChange,
    onColumnFiltersChange: (updater) => {
      // Convert current filters to table's format
      const currentTableFilters = filtering.map((f) => ({
        id: f.columnId,
        value: { value: f.value, operator: f.operator },
      }));

      // Get new filters, properly handling function updaters
      const newFilters =
        typeof updater === "function" ? updater(currentTableFilters) : updater;

      // Convert back to our format
      const newFiltering: FilterPreference[] = newFilters.map(
        (filter, index) => {
          const filterValue = filter.value as {
            value: string;
            operator: FilterPreference["operator"];
          };
          return {
            id: crypto.randomUUID(),
            columnId: filter.id,
            operator: filterValue.operator,
            value: filterValue.value,
            order: index,
          };
        },
      );
      onFilteringChange(newFiltering);
    },
    filterFns: {
      custom: customFilterFn,
    },
    defaultColumn: {
      filterFn: "custom" as unknown as FilterFnOption<Row>,
    },
    meta: {
      updateData: async (
        rowIndex: number,
        columnId: string,
        value: string | number,
      ) => {
        const row = data[rowIndex];
        if (!row) return;

        const column = columns.find((col) => col.id === columnId);
        if (!column) return;

        await updateCellAction({
          rowId: row.id,
          columnId,
          value: String(value),
        });
      },
    },
  }) as TableType;

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: table.getRowModel().rows.length,
    estimateSize: () => 36,
    getScrollElement: () => tableContainerRef.current,
    overscan: 5,
  });

  return {
    tableColumns,
    table,
    rowVirtualizer,
    tableContainerRef,
  };
};

export { useTableConfig };
