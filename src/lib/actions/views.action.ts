"use server";

import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { views, columns, viewFilters, tables } from "~/server/db/schema";

export async function createDefaultView(
  tableId: string,
): Promise<{ viewId: string | null; error?: string }> {
  try {
    // First check if the table exists
    const tableExists = await db
      .select({ id: tables.id })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (tableExists.length === 0) {
      return { viewId: null, error: "Table not found" };
    }

    // Get all columns for the table to set up the default view
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    // Check if we already have a default view (double-check)
    const existingDefaultView = await db
      .select()
      .from(views)
      .where(and(eq(views.tableId, tableId), eq(views.isDefault, true)))
      .limit(1);

    if (existingDefaultView.length > 0 && existingDefaultView[0]?.id) {
      return { viewId: existingDefaultView[0].id };
    }

    // Create a new default view
    const [defaultView] = await db
      .insert(views)
      .values({
        name: "Grid View",
        tableId,
        isDefault: true,
        columnsOrder: tableColumns.map((col) => col.id),
        hiddenColumns: [],
        rowsPerPage: 100,
      })
      .returning();

    if (!defaultView) {
      return { viewId: null, error: "Failed to create default view" };
    }

    return { viewId: defaultView.id };
  } catch (error) {
    console.error("Error in createDefaultView:", error);
    return {
      viewId: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create default view",
    };
  }
}

export async function getDefaultView(
  tableId: string,
): Promise<{ viewId: string | null; error?: string }> {
  try {
    // First check if the table exists
    const tableExists = await db
      .select({ id: tables.id })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (tableExists.length === 0) {
      return { viewId: null, error: "Table not found" };
    }

    // Then check for existing default view
    const defaultView = await db
      .select()
      .from(views)
      .where(and(eq(views.tableId, tableId), eq(views.isDefault, true)))
      .limit(1);

    if (defaultView.length === 0) {
      // If no default view exists, create one
      return createDefaultView(tableId);
    }

    const viewId = defaultView[0]?.id;
    if (!viewId) {
      return { viewId: null, error: "Invalid view data" };
    }

    return { viewId };
  } catch (error) {
    console.error("Error in getDefaultView:", error);
    return {
      viewId: null,
      error:
        error instanceof Error ? error.message : "Failed to get default view",
    };
  }
}

export async function getTableViews(tableId: string) {
  try {
    const tableViews = await db
      .select()
      .from(views)
      .where(eq(views.tableId, tableId))
      .orderBy(views.createdAt);

    return { success: true, views: tableViews };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get table views",
    };
  }
}

export async function createView(
  tableId: string,
  name: string,
): Promise<{
  success: boolean;
  view?: typeof views.$inferSelect;
  error?: string;
}> {
  try {
    // Get all columns for the table to set up the view
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    // Create a new view
    const [newView] = await db
      .insert(views)
      .values({
        name,
        tableId,
        isDefault: false,
        columnsOrder: tableColumns.map((col) => col.id),
        hiddenColumns: [],
        rowsPerPage: 100,
      })
      .returning();

    if (!newView) {
      return { success: false, error: "Failed to create view" };
    }

    return { success: true, view: newView };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create view",
    };
  }
}

export async function deleteView(
  viewId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if it's not the default view
    const view = await db
      .select()
      .from(views)
      .where(eq(views.id, viewId))
      .limit(1);

    if (!view[0]) {
      return { success: false, error: "View not found" };
    }

    if (view[0].isDefault) {
      return { success: false, error: "Cannot delete default view" };
    }

    // First, delete all related view filters
    await db.delete(viewFilters).where(eq(viewFilters.viewId, viewId));

    // Then delete the view
    await db.delete(views).where(eq(views.id, viewId));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete view",
    };
  }
}

export async function renameView(
  viewId: string,
  name: string,
): Promise<{
  success: boolean;
  view?: typeof views.$inferSelect;
  error?: string;
}> {
  try {
    const [updatedView] = await db
      .update(views)
      .set({ name })
      .where(eq(views.id, viewId))
      .returning();

    if (!updatedView) {
      return { success: false, error: "Failed to rename view" };
    }

    return { success: true, view: updatedView };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename view",
    };
  }
}
