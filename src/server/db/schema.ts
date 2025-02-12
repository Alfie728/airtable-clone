import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTableCreator,
  text,
  timestamp,
  uuid,
  boolean,
  pgEnum,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `airtable-clone_${name}`);

// Enums
export const columnTypeEnum = pgEnum("column_type", ["text", "number"]);
export const sortDirectionEnum = pgEnum("sort_direction", ["asc", "desc"]);
export const filterOperatorEnum = pgEnum("filter_operator", [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "is_empty",
  "is_not_empty",
]);

// Users
export const users = createTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").notNull().unique(),
    email: text("email").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (users) => ({
    emailIndex: uniqueIndex("email_idx").on(users.email),
    clerkIdIndex: uniqueIndex("clerk_id_idx").on(users.clerkId),
  }),
);

// User Settings
export const userSettings = createTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  theme: text("theme").default("light").notNull(),
  defaultRowsPerPage: integer("default_rows_per_page").default(100).notNull(),
  preferences: jsonb("preferences").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

// Bases
export const bases = createTable(
  "base",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (bases) => ({
    nameIndex: index("name_idx").on(bases.name),
    userIdIndex: index("user_id_idx").on(bases.userId),
  }),
);

// Tables
export const tables = createTable(
  "tables",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    baseId: uuid("base_id")
      .references(() => bases.id)
      .notNull(),
    rowCount: integer("row_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (tables) => ({
    nameBaseIndex: uniqueIndex("name_base_idx").on(tables.name, tables.baseId),
  }),
);

// Columns
export const columns = createTable(
  "columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    type: columnTypeEnum("type").notNull(),
    tableId: uuid("table_id")
      .references(() => tables.id)
      .notNull(),
    order: integer("order").notNull(),
    width: integer("width").default(200).notNull(),
    isSearchable: boolean("is_searchable").default(true).notNull(),
    isSortable: boolean("is_sortable").default(true).notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    defaultValue: text("default_value"),
    validation: jsonb("validation").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (columns) => ({
    tableOrderIndex: index("columns_table_order_idx").on(
      columns.tableId,
      columns.order,
    ),
  }),
);

// Rows
export const rows = createTable(
  "rows",
  {
    id: uuid("id").primaryKey(),
    tableId: uuid("table_id")
      .references(() => tables.id)
      .notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (rows) => ({
    tableOrderIndex: index("rows_table_order_idx").on(rows.tableId, rows.order),
  }),
);

// Cells
export const cells = createTable(
  "cells",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    value: text("value").notNull(),
    displayValue: text("display_value"),
    rowId: uuid("row_id")
      .references(() => rows.id)
      .notNull(),
    columnId: uuid("column_id")
      .references(() => columns.id)
      .notNull(),
    searchVector: text("search_vector").notNull().$type<"tsvector">(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (cells) => ({
    rowColumnIndex: uniqueIndex("row_column_idx").on(
      cells.rowId,
      cells.columnId,
    ),
    valueIndex: index("value_idx").on(cells.value),
    searchVectorIdx: sql`CREATE INDEX search_vector_idx ON cells USING gin(search_vector)`,
  }),
);

// Views
export const views = createTable(
  "views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    tableId: uuid("table_id")
      .references(() => tables.id)
      .notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    columnsOrder: jsonb("columns_order").default([]).notNull(),
    hiddenColumns: jsonb("hidden_columns").default([]).notNull(),
    rowsPerPage: integer("rows_per_page").default(100).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (views) => ({
    tableNameIndex: uniqueIndex("table_name_idx").on(views.tableId, views.name),
  }),
);

// View Filters
export const viewFilters = createTable(
  "view_filters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    viewId: uuid("view_id")
      .references(() => views.id)
      .notNull(),
    columnId: uuid("column_id")
      .references(() => columns.id)
      .notNull(),
    operator: filterOperatorEnum("operator").notNull(),
    value: text("value"),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (viewFilters) => ({
    viewOrderIndex: index("view_filters_order_idx").on(
      viewFilters.viewId,
      viewFilters.order,
    ),
  }),
);

// View Sorts
export const viewSorts = createTable(
  "view_sorts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    viewId: uuid("view_id")
      .references(() => views.id)
      .notNull(),
    columnId: uuid("column_id")
      .references(() => columns.id)
      .notNull(),
    direction: sortDirectionEnum("direction").notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (viewSorts) => ({
    viewOrderIndex: index("view_sorts_order_idx").on(
      viewSorts.viewId,
      viewSorts.order,
    ),
  }),
);

// Audit Logs
export const auditLogs = createTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
