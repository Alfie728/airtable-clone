"use client";

import type { CellContext } from "@tanstack/react-table";
import type { Row } from "~/types/table";
import type { ColumnDefWithMeta } from "~/types/grid";
import { EditableCell } from "../EditableCell";

interface GridCellProps<TValue> {
  context: CellContext<Row, TValue>;
  initialData: Row[] | undefined;
}

export function GridCell<TValue extends string | number>({
  context,
}: GridCellProps<TValue>) {
  const value = (() => {
    const rawValue = context.getValue();
    if (rawValue === undefined || rawValue === null) {
      return "";
    }
    // Show empty string for number type columns with value "0"
    if (
      (context.column.columnDef as ColumnDefWithMeta).meta?.type === "number" &&
      rawValue === "0"
    ) {
      return "";
    }
    return rawValue;
  })();

  return (
    <EditableCell
      getValue={() => value}
      row={context.row}
      column={context.column}
      table={context.table}
    />
  );
}
