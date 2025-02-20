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
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export type TableResponse =
  | {
      success: true;
      table: TableData;
    }
  | {
      success: false;
      error: string;
    };

export type TableCreateResponse =
  | {
      success: true;
      table: SerializedTable;
      defaultViewId: string;
    }
  | {
      success: false;
      error: string;
    };

export type TableRenameResponse =
  | {
      success: true;
      table: SerializedTable;
    }
  | {
      success: false;
      error: string;
    };

export type TableDeleteResponse =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export interface TableListResponse {
  success: boolean;
  error?: string;
  tables?: SerializedTable[];
}

export interface AddColumnParams {
  name: string;
  type: "text" | "number";
  defaultValue?: string | number;
}
