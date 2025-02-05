"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tables, columns, rows, cells } from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBaseById } from "./bases.action";

export async function createTable(
  baseId: string,
  name: string,
  description?: string,
) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  // Verify base ownership
  const base = await getBaseById(baseId);
  if (!base) throw new Error("Base not found");

  try {
    // Check if table name already exists in this base
    const existingTable = await db
      .select()
      .from(tables)
      .where(and(eq(tables.baseId, baseId), eq(tables.name, name)))
      .limit(1);

    if (existingTable.length > 0) {
      return { success: false, error: "A table with this name already exists" };
    }

    // Create the table with zero rows
    const [newTable] = await db
      .insert(tables)
      .values({
        baseId,
        name,
        description,
        rowCount: 0,
      })
      .returning();

    if (!newTable) {
      return { success: false, error: "Failed to create table" };
    }

    // Create default columns (just Name and Notes)
    const defaultColumns = [
      { name: "Name", type: "text" as const, order: 0 },
      { name: "Notes", type: "text" as const, order: 1 },
    ];

    // Insert the columns without any data
    await db.insert(columns).values(
      defaultColumns.map((col) => ({
        tableId: newTable.id,
        name: col.name,
        type: col.type,
        order: col.order,
        width: 200,
        isSearchable: true,
        isSortable: true,
        isVisible: true,
      })),
    );

    revalidatePath(`/base/${baseId}`);
    return { success: true, table: newTable };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create table" };
  }
}

export async function getTables(baseId: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const baseTables = await db
      .select()
      .from(tables)
      .where(eq(tables.baseId, baseId))
      .orderBy(tables.createdAt);

    return { success: true, tables: baseTables };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get tables" };
  }
}

export async function getTableData(tableId: string, tableName: string) {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // Get all columns for this table
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    // Get all rows for this table
    const tableRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(rows.order);

    // Get all cells for these rows
    const tableCells = await Promise.all(
      tableRows.map(async (row) => {
        const rowCells = await db
          .select()
          .from(cells)
          .where(eq(cells.rowId, row.id));
        return rowCells;
      }),
    );

    // Transform the data into the format expected by DataGrid
    const gridData = tableRows.map((row, rowIndex) => {
      const rowData: { id: string; [key: string]: string | number } = {
        id: row.id,
      };
      const rowCells = tableCells[rowIndex];
      if (rowCells) {
        rowCells.forEach((cell) => {
          const column = tableColumns.find((col) => col.id === cell.columnId);
          if (column) {
            // Use the original column name without transformation
            rowData[column.name] =
              column.type === "number" ? Number(cell.value) || 0 : cell.value;
          }
        });
      }
      return rowData;
    });

    const transformedColumns = tableColumns.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      order: col.order,
      width: col.width,
      isSearchable: col.isSearchable,
      isSortable: col.isSortable,
      isVisible: col.isVisible,
    }));

    return {
      success: true,
      table: {
        id: tableId,
        name: tableName,
        columns: transformedColumns,
        data: gridData,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to get table data" };
  }
}

export async function addRow(tableId: string) {
  try {
    // Get the table to get the baseId
    const table = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table[0]) {
      return { success: false, error: "Table not found" };
    }

    // Insert new row
    const [newRow] = await db
      .insert(rows)
      .values({
        tableId,
        order: await getNextRowOrder(tableId),
      })
      .returning();

    // Update table row count
    await db
      .update(tables)
      .set({ rowCount: sql`${tables.rowCount} + 1` })
      .where(eq(tables.id, tableId));

    revalidatePath(`/base/${table[0].baseId}`);
    return { success: true, row: newRow };
  } catch (error) {
    console.error("Error adding row:", error);
    return { success: false, error: "Failed to add row" };
  }
}

export async function addCell(rowId: string, columnId: string, value: string) {
  try {
    // Get the row and table info for revalidation
    const rowData = await db
      .select({
        row: rows,
        table: tables,
      })
      .from(rows)
      .where(eq(rows.id, rowId))
      .innerJoin(tables, eq(tables.id, rows.tableId))
      .limit(1);

    if (!rowData[0]) {
      return { success: false, error: "Row not found" };
    }

    // Check if cell already exists
    const existingCell = await db
      .select()
      .from(cells)
      .where(and(eq(cells.rowId, rowId), eq(cells.columnId, columnId)))
      .limit(1);

    let cell;
    if (existingCell.length > 0) {
      // Update existing cell
      const [updatedCell] = await db
        .update(cells)
        .set({
          value,
          displayValue: value,
          searchVector: sql`to_tsvector('english', ${value})`,
        })
        .where(and(eq(cells.rowId, rowId), eq(cells.columnId, columnId)))
        .returning();
      cell = updatedCell;
    } else {
      // Insert new cell
      const [newCell] = await db
        .insert(cells)
        .values({
          rowId,
          columnId,
          value,
          displayValue: value,
          searchVector: sql`to_tsvector('english', ${value})`,
        })
        .returning();
      cell = newCell;
    }

    revalidatePath(`/base/${rowData[0].table.baseId}`);
    return { success: true, cell };
  } catch (error) {
    console.error("Error adding/updating cell:", error);
    return { success: false, error: "Failed to add/update cell" };
  }
}

async function getNextRowOrder(tableId: string): Promise<number> {
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`MAX(${rows.order})` })
    .from(rows)
    .where(eq(rows.tableId, tableId));

  return (maxOrderResult[0]?.maxOrder ?? -1) + 1;
}
