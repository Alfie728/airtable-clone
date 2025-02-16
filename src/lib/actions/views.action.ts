"use server";

import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { views, columns } from "~/server/db/schema";

export async function createDefaultView(
  tableId: string,
): Promise<{ viewId: string | null; error?: string }> {
  try {
    // Get all columns for the table to set up the default view
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

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
    return {
      viewId: null,
      error:
        error instanceof Error ? error.message : "Failed to get default view",
    };
  }
}
