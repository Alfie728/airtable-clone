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
    structure: (tableId: string) => ["tables", tableId, "structure"] as const,
    viewData: (tableId: string, viewId: string) =>
      ["tables", tableId, "views", viewId, "data"] as const,
  },
  views: {
    root: ["views"] as const,
    list: (tableId: string) => ["views", tableId, "list"] as const,
    detail: (viewId: string) => ["views", viewId] as const,
    config: (viewId: string) => ["views", viewId, "config"] as const,
    customizations: {
      root: (viewId: string) => ["views", viewId, "customizations"] as const,
      sorts: (viewId: string) =>
        [...queryKeys.views.customizations.root(viewId), "sorts"] as const,
      filters: (viewId: string) =>
        [...queryKeys.views.customizations.root(viewId), "filters"] as const,
      columns: (viewId: string) =>
        [...queryKeys.views.customizations.root(viewId), "columns"] as const,
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

// Helper to get all query keys under a specific base
export const getBaseRelatedQueryKeys = (baseId: string) => [
  queryKeys.bases.detail(baseId),
  queryKeys.bases.info(baseId),
  queryKeys.bases.tables.list(baseId),
];

// Helper to get all query keys under a specific table
export const getTableRelatedQueryKeys = (tableId: string) => [
  queryKeys.tables.detail(tableId),
  queryKeys.tables.data(tableId),
  queryKeys.tables.structure(tableId),
  queryKeys.views.list(tableId),
];

// Helper to get all query keys under a specific view
export const getViewRelatedQueryKeys = (viewId: string) => [
  queryKeys.views.detail(viewId),
  queryKeys.views.config(viewId),
  queryKeys.views.customizations.root(viewId),
  queryKeys.views.customizations.sorts(viewId),
  queryKeys.views.customizations.filters(viewId),
  queryKeys.views.customizations.columns(viewId),
];

// Helper to get all view-specific table data keys
export const getViewSpecificTableKeys = (tableId: string, viewId: string) => [
  queryKeys.tables.viewData(tableId, viewId),
  ...getViewRelatedQueryKeys(viewId),
];
