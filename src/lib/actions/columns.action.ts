"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { columns, cells } from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { Column } from "~/types/table";

export interface ColumnResponse {
  success: boolean;
  error?: string;
  column?: Column;
}

export interface ColumnOrderResponse {
  success: boolean;
  error?: string;
  columns?: Column[];
}

export async function addColumn(
  tableId: string,
  name: string,
  type: "text" | "number",
): Promise<ColumnResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the current max order
    const [maxOrderResult] = await db
      .select({ maxOrder: sql<number>`MAX(${columns.order})` })
      .from(columns)
      .where(eq(columns.tableId, tableId));

    const newOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

    // Create the new column with the client-provided name
    const [newColumn] = await db
      .insert(columns)
      .values({
        tableId,
        name,
        type,
        order: newOrder,
        width: 200,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      })
      .returning();

    return { success: true, column: newColumn };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add column",
    };
  }
}

export async function deleteColumn(
  tableId: string,
  columnId: string,
): Promise<ColumnResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the column to be deleted first to check if it exists and get its order
    const [columnToDelete] = await db
      .select()
      .from(columns)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .limit(1);

    if (!columnToDelete) {
      return { success: false, error: "Column not found" };
    }

    // Delete all cells for this column
    await db.delete(cells).where(eq(cells.columnId, columnId));

    // Delete the column
    const [deletedColumn] = await db
      .delete(columns)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .returning();

    // Update the order of remaining columns
    await db
      .update(columns)
      .set({
        order: sql`${columns.order} - 1`,
      })
      .where(
        and(
          eq(columns.tableId, tableId),
          sql`${columns.order} > ${columnToDelete.order}`,
        ),
      );

    return { success: true, column: deletedColumn };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete column",
    };
  }
}

export async function renameColumn(
  tableId: string,
  columnId: string,
  newName: string,
): Promise<ColumnResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if column exists
    const existingColumn = await db
      .select()
      .from(columns)
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .limit(1);

    if (!existingColumn[0]) {
      return { success: false, error: "Column not found" };
    }

    // Check if new name already exists in this table
    const duplicateColumn = await db
      .select()
      .from(columns)
      .where(
        and(
          eq(columns.tableId, tableId),
          eq(columns.name, newName),
          sql`${columns.id} != ${columnId}`,
        ),
      )
      .limit(1);

    if (duplicateColumn.length > 0) {
      return {
        success: false,
        error: "A column with this name already exists",
      };
    }

    // Update column name
    const [updatedColumn] = await db
      .update(columns)
      .set({ name: newName })
      .where(and(eq(columns.id, columnId), eq(columns.tableId, tableId)))
      .returning();

    return { success: true, column: updatedColumn };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename column",
    };
  }
}

export async function updateColumnsOrder(
  tableId: string,
  columnOrders: { id: string; order: number }[],
): Promise<ColumnOrderResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    if (!columnOrders.length) {
      return { success: false, error: "No columns to update" };
    }

    // Update each column order sequentially
    const updatedColumns = [];
    for (const col of columnOrders) {
      const [updatedColumn] = await db
        .update(columns)
        .set({ order: col.order })
        .where(and(eq(columns.id, col.id), eq(columns.tableId, tableId)))
        .returning();

      if (!updatedColumn) {
        // If any update fails, return error
        return { success: false, error: `Failed to update column ${col.id}` };
      }
      updatedColumns.push(updatedColumn);
    }

    if (!updatedColumns.length) {
      return { success: false, error: "Failed to update column orders" };
    }

    return { success: true, columns: updatedColumns };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update column orders",
    };
  }
}
