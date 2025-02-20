export const queryKeys = {
  bases: {
    root: ["bases"] as const,
    list: () => ["bases"] as const,
    detail: (baseId: string) => ["bases", baseId] as const,
    info: (baseId: string) =>
      [...queryKeys.bases.detail(baseId), "info"] as const,
    tables: {
      list: (baseId: string) => ["bases", baseId, "tables"] as const,
      detail: (baseId: string, tableId: string) =>
        [...queryKeys.bases.detail(baseId), "tables", tableId] as const,
    },
  },
  tables: {
    root: ["tables"] as const,
    detail: (tableId: string) => ["tables", tableId] as const,
    structure: {
      root: (tableId: string) => ["tables", tableId, "structure"] as const,
      columns: (tableId: string) =>
        ["tables", tableId, "structure", "columns"] as const,
      metadata: (tableId: string) =>
        ["tables", tableId, "structure", "metadata"] as const,
    },
    data: {
      root: (tableId: string) => ["tables", tableId, "data"] as const,
      paginated: (tableId: string, page: number) =>
        ["tables", tableId, "data", "page", page] as const,
    },
  },
  views: {
    root: ["views"] as const,
    list: (tableId: string) => ["tables", tableId, "views"] as const,
    detail: (viewId: string) => ["views", viewId] as const,
    structure: {
      root: (viewId: string) => ["views", viewId, "structure"] as const,
      metadata: (viewId: string) => ["views", viewId, "metadata"] as const,
      configuration: {
        root: (viewId: string) => ["views", viewId, "configuration"] as const,
        sorts: (viewId: string) =>
          ["views", viewId, "configuration", "sorts"] as const,
        filters: (viewId: string) =>
          ["views", viewId, "configuration", "filters"] as const,
        columns: (viewId: string) =>
          ["views", viewId, "configuration", "columns"] as const,
      },
    },
    data: {
      root: (tableId: string, viewId: string) =>
        ["tables", tableId, "views", viewId, "data"] as const,
      withConfig: (
        tableId: string,
        viewId: string,
        config: {
          sorts?: string;
          filters?: string;
          page?: number;
        },
      ) => ["tables", tableId, "views", viewId, "data", config] as const,
    },
  },
  user: {
    root: ["user"] as const,
    settings: () => [...queryKeys.user.root, "settings"] as const,
    preferences: () => [...queryKeys.user.root, "preferences"] as const,
    bases: {
      recent: () => [...queryKeys.user.root, "bases", "recent"] as const,
    },
  },
} as const;

type QueryKeyType = readonly unknown[];

// Helper to get all query keys under a specific base
export const getBaseRelatedQueryKeys = (baseId: string): QueryKeyType[] => [
  queryKeys.bases.detail(baseId),
  queryKeys.bases.info(baseId),
  queryKeys.bases.tables.list(baseId),
];

// Helper to get all query keys under a specific table
export const getTableRelatedQueryKeys = (tableId: string): QueryKeyType[] => [
  queryKeys.tables.detail(tableId),
  queryKeys.tables.data.root(tableId),
  queryKeys.tables.structure.root(tableId),
  queryKeys.views.list(tableId),
];

// Helper to get all query keys under a specific view
export const getViewRelatedQueryKeys = (viewId: string): QueryKeyType[] => [
  queryKeys.views.detail(viewId),
  queryKeys.views.structure.root(viewId),
  queryKeys.views.structure.metadata(viewId),
  queryKeys.views.structure.configuration.root(viewId),
  queryKeys.views.structure.configuration.sorts(viewId),
  queryKeys.views.structure.configuration.filters(viewId),
  queryKeys.views.structure.configuration.columns(viewId),
];

// Helper to get all view-specific table data keys
export const getViewSpecificTableKeys = (
  tableId: string,
  viewId: string,
): QueryKeyType[] => [
  queryKeys.tables.data.root(tableId),
  queryKeys.tables.structure.root(tableId),
  queryKeys.views.data.root(tableId, viewId),
  ...getViewRelatedQueryKeys(viewId),
];
