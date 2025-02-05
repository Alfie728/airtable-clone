"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tables, columns, rows, cells } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
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

    // Create the table
    const [newTable] = await db
      .insert(tables)
      .values({
        baseId,
        name,
        description,
      })
      .returning();

    if (!newTable) {
      return { success: false, error: "Failed to create table" };
    }

    // Create default columns
    const defaultColumns = [
      { name: "Name", type: "text" as const, order: 0 },
      { name: "Age", type: "number" as const, order: 1 },
      { name: "City", type: "text" as const, order: 2 },
    ];

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
            rowData[column.name.toLowerCase().replace(/\s+/g, "_")] =
              cell.value;
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
