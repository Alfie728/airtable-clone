"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tables, columns, rows, cells } from "~/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBaseById } from "./bases.action";
import type { Row } from "~/types/table";

export async function createTable(
  baseId: string,
  name: string,
  clientProvidedId: string,
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

    // Create the table with zero rows using the client-provided ID
    const [newTable] = await db
      .insert(tables)
      .values({
        id: clientProvidedId,
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

    revalidatePath(`/base/${baseId}`, "page");
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

    // Get all rows and their cells in a single query
    const rowsWithCells = await db
      .select({
        row: rows,
        cell: cells,
      })
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .leftJoin(cells, eq(cells.rowId, rows.id))
      .orderBy(rows.order);

    // Transform the data efficiently
    const gridData: Row[] = [];
    let currentRow: Row | null = null;

    for (const record of rowsWithCells) {
      if (!currentRow || currentRow.id !== record.row.id) {
        if (currentRow) {
          gridData.push(currentRow);
        }
        currentRow = { id: record.row.id };
      }

      if (record.cell?.columnId) {
        const column = tableColumns.find(
          (col) => col.id === record.cell!.columnId,
        );
        if (column) {
          currentRow[column.name] =
            column.type === "number"
              ? Number(record.cell.value) || 0
              : record.cell.value;
        }
      }
    }
    if (currentRow) {
      gridData.push(currentRow);
    }

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

export async function addRow(
  tableId: string,
  optimisticRow: Record<string, string | number>,
) {
  try {
    // Get table columns first
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    // Get next row order
    const nextOrder = await getNextRowOrder(tableId);

    // Create the row using the client-provided ID
    const [newRow] = await db
      .insert(rows)
      .values({
        id: optimisticRow.id as string, // Use the client-provided ID
        tableId,
        order: nextOrder,
      })
      .returning();

    if (!newRow) {
      return { success: false, error: "Failed to create row" };
    }

    // Use the exact values from the optimistic row
    const cellValues = tableColumns.map((column) => {
      // Get the exact value from the optimistic row
      const value = optimisticRow[column.name]?.toString() ?? "";

      return {
        rowId: newRow.id,
        columnId: column.id,
        value,
        displayValue: value,
        searchVector: sql`to_tsvector(${value})`,
      };
    });

    // Insert all cells
    await db.insert(cells).values(cellValues);

    // Update row count
    await db
      .update(tables)
      .set({ rowCount: sql`row_count + 1` })
      .where(eq(tables.id, tableId));

    revalidatePath("/base/[baseId]", "page");
    return { success: true, row: { ...newRow, ...optimisticRow } };
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

    revalidatePath(`/base/${rowData[0].table.baseId}`, "page");
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

export async function addBulkRows(
  tableId: string,
  optimisticRows: Record<string, string | number>[],
) {
  try {
    const CHUNK_SIZE = 1000;
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    const lastRow = await db
      .select({ order: rows.order })
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(desc(rows.order))
      .limit(1);

    const startOrder = (lastRow[0]?.order ?? 0) + 1;
    const allNewRows = [];

    // Process in chunks
    for (let i = 0; i < optimisticRows.length; i += CHUNK_SIZE) {
      const chunk = optimisticRows.slice(i, i + CHUNK_SIZE);

      // Insert chunk of rows
      const rowsToInsert = chunk.map((row, index) => ({
        id: String(row.id),
        tableId,
        order: startOrder + i + index,
      }));

      const newRows = await db.insert(rows).values(rowsToInsert).returning();

      // Merge server and client data, preserving client values
      const mergedRows = newRows.map((newRow, idx) => ({
        ...newRow,
        ...chunk[idx],
      }));
      allNewRows.push(...mergedRows);

      // Insert cells for this chunk using client's optimistic data
      const cellsForChunk = newRows.flatMap((row, rowIndex) =>
        tableColumns.map((column) => {
          const optimisticRow = chunk[rowIndex] ?? {};
          const value = optimisticRow[column.name]?.toString() ?? "";
          return {
            rowId: row.id,
            columnId: column.id,
            value,
            displayValue: value,
            searchVector: sql`to_tsvector(${value})`,
          };
        }),
      );

      await db.insert(cells).values(cellsForChunk);
    }

    // Update row count once at the end
    await db
      .update(tables)
      .set({ rowCount: sql`row_count + ${optimisticRows.length}` })
      .where(eq(tables.id, tableId));

    revalidatePath("/base/[baseId]", "page");
    return {
      success: true,
      rows: allNewRows,
    };
  } catch {
    return { success: false, error: "Failed to add bulk rows" };
  }
}
