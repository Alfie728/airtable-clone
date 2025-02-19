export const queryKeys = {
  bases: {
    root: ["bases"] as const,
    list: () => ["bases"],
    detail: (baseId: string) => ["bases", baseId],
    info: (baseId: string) =>
      [...queryKeys.bases.detail(baseId), "info"] as const,
    tables: {
      list: (baseId: string) => ["bases", baseId, "tables"],
      detail: (baseId: string, tableId: string) =>
        [...queryKeys.bases.detail(baseId), "tables", tableId] as const,
    },
  },
  tables: {
    root: ["tables"] as const,
    detail: (tableId: string) => ["tables", tableId],
    data: (tableId: string) => ["tables", tableId, "data"] as const,
    columns: (tableId: string) =>
      [...queryKeys.tables.detail(tableId), "columns"] as const,
    rows: (tableId: string) =>
      [...queryKeys.tables.detail(tableId), "rows"] as const,
    views: {
      list: (tableId: string) =>
        [...queryKeys.tables.detail(tableId), "views", "list"] as const,
      detail: (tableId: string, viewId: string) =>
        [
          ...queryKeys.tables.detail(tableId),
          "views",
          "detail",
          viewId,
        ] as const,
    },
  },
  views: {
    root: ["views"] as const,
    detail: (viewId: string) => ["views", viewId] as const,
    filters: (viewId: string) =>
      [...queryKeys.views.detail(viewId), "filters"] as const,
    sorts: (viewId: string) =>
      [...queryKeys.views.detail(viewId), "sorts"] as const,
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

// Helper to get all query keys under a specific base
export const getBaseRelatedQueryKeys = (baseId: string) => [
  queryKeys.bases.detail(baseId),
  queryKeys.bases.info(baseId),
  queryKeys.bases.tables.list(baseId),
];

// Helper to get all query keys under a specific table
export const getTableRelatedQueryKeys = (tableId: string) => [
  queryKeys.tables.detail(tableId),
  queryKeys.tables.columns(tableId),
  queryKeys.tables.rows(tableId),
  queryKeys.tables.views.list(tableId),
];

// Helper to get all query keys under a specific view
export const getViewRelatedQueryKeys = (viewId: string) => [
  queryKeys.views.detail(viewId),
  queryKeys.views.filters(viewId),
  queryKeys.views.sorts(viewId),
];
