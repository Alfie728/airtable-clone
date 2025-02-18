"use client";

import type { CellContext } from "@tanstack/react-table";
import type { Row } from "~/types/table";
import { EditableCell } from "../EditableCell";

interface GridCellProps {
  context: CellContext<Row, string | number>;
  initialData: Row[] | undefined;
}

export function GridCell({ context }: GridCellProps) {
  return (
    <EditableCell
      getValue={context.getValue}
      row={context.row}
      column={context.column}
      table={context.table}
    />
  );
}
