import type { tables } from "~/server/db/schema";

export interface Column {
  id: string;
  name: string;
  type: "text" | "number";
  order: number;
  width: number;
  isSearchable: boolean;
  isSortable: boolean;
  isVisible: boolean;
}

export interface Row {
  id: string;
  [key: string]: string | number;
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
}

export interface TableRenameResponse {
  success: boolean;
  error?: string;
  table?: SerializedTable;
}

export interface TableListResponse {
  success: boolean;
  error?: string;
  tables?: SerializedTable[];
}
