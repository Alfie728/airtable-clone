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
  const value =
    context.getValue() ??
    ((context.column.columnDef as ColumnDefWithMeta).meta?.type === "number"
      ? 0
      : "");
  return (
    <EditableCell
      getValue={() => value}
      row={context.row}
      column={context.column}
      table={context.table}
    />
  );
}
