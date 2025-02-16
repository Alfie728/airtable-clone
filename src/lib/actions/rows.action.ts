"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { rows, cells } from "~/server/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { Row } from "~/types/table";

export interface RowResponse {
  success: boolean;
  error?: string;
  row?: Row;
}

export interface RowsResponse {
  success: boolean;
  error?: string;
  rows?: Row[];
}

export async function deleteRow(
  tableId: string,
  rowId: string,
): Promise<RowResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the row to be deleted first to check if it exists and get its order
    const [rowToDelete] = await db
      .select()
      .from(rows)
      .where(and(eq(rows.id, rowId), eq(rows.tableId, tableId)))
      .limit(1);

    if (!rowToDelete) {
      return { success: false, error: "Row not found" };
    }

    // Delete all cells for this row
    await db.delete(cells).where(eq(cells.rowId, rowId));

    // Delete the row
    const [deletedRow] = await db
      .delete(rows)
      .where(and(eq(rows.id, rowId), eq(rows.tableId, tableId)))
      .returning();

    // Update the order of remaining rows
    await db
      .update(rows)
      .set({
        order: sql`${rows.order} - 1`,
      })
      .where(
        and(
          eq(rows.tableId, tableId),
          sql`${rows.order} > ${rowToDelete.order}`,
        ),
      );

    return {
      success: true,
      row: deletedRow
        ? {
            id: deletedRow.id,
            order: deletedRow.order,
          }
        : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete row",
    };
  }
}

export async function bulkDeleteRows(
  tableId: string,
  rowIds: string[],
): Promise<RowsResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the rows to be deleted to check if they exist and get their orders
    const rowsToDelete = await db
      .select()
      .from(rows)
      .where(and(eq(rows.tableId, tableId), inArray(rows.id, rowIds)));

    if (rowsToDelete.length !== rowIds.length) {
      return { success: false, error: "Some rows not found" };
    }

    // Delete all cells for these rows
    await db.delete(cells).where(inArray(cells.rowId, rowIds));

    // Delete the rows
    const deletedRows = await db
      .delete(rows)
      .where(and(eq(rows.tableId, tableId), inArray(rows.id, rowIds)))
      .returning();

    // Get the minimum order from deleted rows
    const minOrder = Math.min(...rowsToDelete.map((row) => row.order));

    // Update the order of remaining rows
    await db
      .update(rows)
      .set({
        order: sql`${rows.order} - ${rowsToDelete.length}`,
      })
      .where(and(eq(rows.tableId, tableId), sql`${rows.order} > ${minOrder}`));

    return {
      success: true,
      rows: deletedRows.map((row) => ({
        id: row.id,
        order: row.order,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete rows",
    };
  }
}

export async function updateRowsOrder(
  tableId: string,
  rowOrders: { id: string; order: number }[],
): Promise<RowsResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    if (!rowOrders.length) {
      return { success: false, error: "No rows to update" };
    }

    // Update each row order sequentially
    const updatedRows = [];
    for (const row of rowOrders) {
      const [updatedRow] = await db
        .update(rows)
        .set({ order: row.order })
        .where(and(eq(rows.id, row.id), eq(rows.tableId, tableId)))
        .returning();

      if (!updatedRow) {
        // If any update fails, return error
        return { success: false, error: `Failed to update row ${row.id}` };
      }
      updatedRows.push({
        id: updatedRow.id,
        order: updatedRow.order,
      });
    }

    if (!updatedRows.length) {
      return { success: false, error: "Failed to update row orders" };
    }

    return { success: true, rows: updatedRows };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update row orders",
    };
  }
}
