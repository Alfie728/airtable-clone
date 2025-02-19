"use client";

import { useMemo, useRef } from "react";
import type {
  CellContext,
  HeaderContext,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Row, Column } from "~/types/table";
import type { TableConfigProps, TableConfig } from "~/types/table-config";
import type { ColumnDefWithMeta, ColumnMeta, TableType } from "~/types/grid";
import { useQueryClient } from "@tanstack/react-query";
import { GridCell } from "../components/GridCell";
import { GridHeader } from "../components/GridHeader";

const useTableConfig = ({
  columns,
  data,
  initialData,
  tableId,
  sorting,
  columnOrder,
  onSortingChangeAction,
  onColumnOrderChange,
  updateCellAction,
}: TableConfigProps): TableConfig => {
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

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    // getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    isMultiSortEvent: () => true,
    enableMultiSort: true,
    sortDescFirst: false,
    state: {
      sorting,
      columnOrder,
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
