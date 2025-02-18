"use client";

import type { HeaderContext } from "@tanstack/react-table";
import type { Row, Column } from "~/types/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { ColumnManagement } from "../ColumnManagement";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query/keys";

interface GridHeaderProps {
  column: Column;
  headerContext: HeaderContext<Row, string | number>;
  tableId: string;
  queryClient: QueryClient;
}

export function GridHeader({
  column,
  headerContext,
  tableId,
  queryClient,
}: GridHeaderProps) {
  const sortIndex = headerContext.table
    .getState()
    .sorting.findIndex((sort) => sort.id === column.id);

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <span>{column.name}</span>
        {headerContext.column.getCanSort() && (
          <div
            className={cn(
              "text-gray-400",
              headerContext.column.getIsSorted() && "text-blue-600",
            )}
          >
            {headerContext.column.getIsSorted() === "asc" ? (
              <div className="flex items-center">
                <ArrowUp className="h-4 w-4" />
                {sortIndex > -1 && (
                  <span className="ml-1 text-xs">{sortIndex + 1}</span>
                )}
              </div>
            ) : headerContext.column.getIsSorted() === "desc" ? (
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4" />
                {sortIndex > -1 && (
                  <span className="ml-1 text-xs">{sortIndex + 1}</span>
                )}
              </div>
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
      <ColumnManagement
        tableId={tableId}
        column={column}
        onColumnUpdated={() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.tables.detail(tableId),
          });
        }}
        onSort={(direction, isMulti) => {
          if (!direction) {
            headerContext.column.clearSorting();
          } else {
            headerContext.column.toggleSorting(direction === "desc", isMulti);
          }
        }}
        sortDirection={
          headerContext.column.getIsSorted() as "asc" | "desc" | null
        }
        sortIndex={sortIndex > -1 ? sortIndex : undefined}
      />
    </div>
  );
}
