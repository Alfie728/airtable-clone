import type { tables } from "~/server/db/schema";

export interface Column {
  id: string;
  name: string;
  type: "text" | "number";
  order: number;
  width?: number;
  isSearchable?: boolean;
  isSortable?: boolean;
  isVisible?: boolean;
}

export interface Row {
  id: string;
  order: number;
  [key: string]: string | number;
}

export interface Cell {
  id: string;
  rowId: string;
  columnId: string;
  value: string;
}

export interface SerializedTable {
  id: string;
  name: string;
  baseId: string;
  description: string | null;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableData {
  id: string;
  name: string;
  columns: Column[];
  data: Row[];
}

export interface TableResponse {
  success: boolean;
  error?: string;
  table?: TableData;
}

export interface TableCreateResponse {
  success: boolean;
  error?: string;
  table?: typeof tables.$inferSelect;
  defaultViewId?: string;
}

export interface TableRenameResponse {
  success: boolean;
  error?: string;
  table?: SerializedTable;
}

export interface TableDeleteResponse {
  success: boolean;
  error?: string;
  table?: SerializedTable;
  nextTableId?: string;
}

export interface TableListResponse {
  success: boolean;
  error?: string;
  tables?: SerializedTable[];
}
