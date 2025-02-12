import { type tables } from "~/server/db/schema";

export interface Row {
  id: string;
  [key: string]: string | number;
}

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

export interface TableData {
  id: string;
  name: string;
  columns: Column[];
  data: Row[];
}

export interface TableResponse {
  success: boolean;
  table?: TableData;
  error?: string;
}

export interface BaseResponse {
  success: boolean;
  tables?: (typeof tables.$inferSelect)[];
  error?: string;
}

export interface TableCreateResponse {
  success: boolean;
  table?: typeof tables.$inferSelect;
  error?: string;
}
