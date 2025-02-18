import type { Row } from "./table";
import type {
  Table,
  ColumnDef,
  Row as TableRow,
  Header,
  Cell,
} from "@tanstack/react-table";
import type { useVirtualizer } from "@tanstack/react-virtual";

export interface TableMeta {
  updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  handleTabNavigation?: (
    rowId: string,
    columnId: string,
    isShiftKey: boolean,
  ) => void;
}

export interface ColumnMeta {
  name: string;
  type: "text" | "number";
  isNew: (row: Row) => boolean;
}

export type ColumnDefWithMeta = ColumnDef<Row, string | number> & {
  meta?: ColumnMeta;
  id: string;
};

export type TableType = Table<Row>;
export type HeaderType = Header<Row, string | number>;
export type CellType = Cell<Row, string | number>;
export type RowType = TableRow<Row>;

export interface EditableCellProps {
  getValue: () => string | number;
  row: TableRow<Row>;
  column: ColumnDef<Row, string | number>;
  table: TableType;
}

export interface DraggableColumnProps {
  header: HeaderType;
  cells: (CellType & { isDragging: boolean })[];
  virtualizer: ReturnType<
    typeof useVirtualizer<HTMLDivElement, HTMLTableRowElement>
  >;
}
