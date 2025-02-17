"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tables, columns, rows, cells, views } from "~/server/db/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getBaseById } from "./bases.action";
import type {
  Row,
  TableResponse,
  SerializedTable,
  TableRenameResponse,
  TableCreateResponse,
  TableDeleteResponse,
} from "~/types/table";

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
    const createdColumns = await db
      .insert(columns)
      .values(
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
      )
      .returning();

    // Create a default view
    const [defaultView] = await db
      .insert(views)
      .values({
        name: "Grid View",
        tableId: newTable.id,
        isDefault: true,
        columnsOrder: createdColumns.map((col) => col.id),
        hiddenColumns: [],
        rowsPerPage: 100,
      })
      .returning();

    if (!defaultView) {
      return { success: false, error: "Failed to create default view" };
    }

    revalidatePath(`/base/${baseId}`, "page");
    return { success: true, table: newTable, defaultViewId: defaultView.id };
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

function serializeTable(table: typeof tables.$inferSelect): SerializedTable {
  return {
    ...table,
    id: table.id,
    name: table.name,
    baseId: table.baseId,
    description: table.description,
    rowCount: table.rowCount,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt?.toISOString() ?? table.createdAt.toISOString(),
  };
}

export async function renameTable(
  tableId: string,
  newName: string,
): Promise<TableRenameResponse> {
  console.log("RENAME_TABLE_ENTRY_POINT", { tableId, newName });
  const startTime = Date.now();

  try {
    const user = await currentUser();
    console.log(`[${Date.now() - startTime}ms] User auth check completed`);

    if (!user) {
      console.log(`[${Date.now() - startTime}ms] Unauthorized - no user found`);
      return { success: false, error: "Unauthorized" };
    }

    // Check if table exists and get its baseId
    console.log(`[${Date.now() - startTime}ms] Checking if table exists`);
    const existingTable = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!existingTable[0]) {
      console.log(`[${Date.now() - startTime}ms] Table not found`);
      return { success: false, error: "Table not found" };
    }

    const baseId = existingTable[0].baseId;
    console.log(`[${Date.now() - startTime}ms] Found table in base ${baseId}`);

    // Check if new name already exists in this base
    console.log(`[${Date.now() - startTime}ms] Checking for duplicate names`);
    const duplicateTable = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.baseId, baseId),
          eq(tables.name, newName),
          sql`${tables.id} != ${tableId}`,
        ),
      )
      .limit(1);

    if (duplicateTable.length > 0) {
      console.log(`[${Date.now() - startTime}ms] Duplicate name found`);
      return { success: false, error: "A table with this name already exists" };
    }

    // Update table name
    console.log(`[${Date.now() - startTime}ms] Updating table name`);
    const [updatedTable] = await db
      .update(tables)
      .set({ name: newName, updatedAt: new Date() })
      .where(eq(tables.id, tableId))
      .returning();

    if (!updatedTable) {
      console.log(`[${Date.now() - startTime}ms] Failed to update table`);
      return { success: false, error: "Failed to rename table" };
    }

    console.log(`[${Date.now() - startTime}ms] Table renamed successfully`);
    console.log(`[${Date.now() - startTime}ms] Starting path revalidation`);
    revalidatePath(`/base/${baseId}`, "page");
    console.log(`[${Date.now() - startTime}ms] Operation complete`);

    return { success: true, table: serializeTable(updatedTable) };
  } catch (err) {
    console.error(`[${Date.now() - startTime}ms] Operation failed:`, err);
    const error = err instanceof Error ? err.message : "Failed to rename table";
    return { success: false, error };
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
        currentRow = { id: record.row.id, order: record.row.order };
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

export async function deleteTableAction(
  baseId: string,
  tableId: string,
): Promise<TableDeleteResponse> {
  console.log("DELETE_TABLE_ENTRY_POINT", { baseId, tableId });
  const startTime = Date.now();

  try {
    const user = await currentUser();
    console.log(`[${Date.now() - startTime}ms] User auth check completed`);

    if (!user) {
      console.log(`[${Date.now() - startTime}ms] Unauthorized - no user found`);
      return { success: false, error: "Unauthorized" };
    }

    // Check if table exists
    console.log(`[${Date.now() - startTime}ms] Checking if table exists`);
    const existingTable = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!existingTable[0]) {
      console.log(`[${Date.now() - startTime}ms] Table not found`);
      return { success: false, error: "Table not found" };
    }

    console.log(`[${Date.now() - startTime}ms] Starting cascading delete`);

    // Delete view filters first
    console.log(`[${Date.now() - startTime}ms] Deleting view filters`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_view_filters"
      WHERE view_id IN (
        SELECT id FROM "airtable-clone_views"
        WHERE table_id = ${tableId}
      );
    `);

    // Delete view sorts
    console.log(`[${Date.now() - startTime}ms] Deleting view sorts`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_view_sorts"
      WHERE view_id IN (
        SELECT id FROM "airtable-clone_views"
        WHERE table_id = ${tableId}
      );
    `);

    // Delete views
    console.log(`[${Date.now() - startTime}ms] Deleting views`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_views"
      WHERE table_id = ${tableId};
    `);

    // Delete cells
    console.log(`[${Date.now() - startTime}ms] Deleting cells`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_cells"
      WHERE row_id IN (
        SELECT id FROM "airtable-clone_rows"
        WHERE table_id = ${tableId}
      )
      OR column_id IN (
        SELECT id FROM "airtable-clone_columns"
        WHERE table_id = ${tableId}
      );
    `);

    // Delete rows
    console.log(`[${Date.now() - startTime}ms] Deleting rows`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_rows"
      WHERE table_id = ${tableId};
    `);

    // Delete columns
    console.log(`[${Date.now() - startTime}ms] Deleting columns`);
    await db.execute(sql`
      DELETE FROM "airtable-clone_columns"
      WHERE table_id = ${tableId};
    `);

    // Finally delete the table
    console.log(`[${Date.now() - startTime}ms] Deleting table`);
    const [deletedTable] = await db
      .delete(tables)
      .where(eq(tables.id, tableId))
      .returning();

    if (!deletedTable) {
      throw new Error("Table not found during deletion");
    }

    console.log(`[${Date.now() - startTime}ms] All deletions completed`);

    console.log(`[${Date.now() - startTime}ms] Operation complete`);

    return { success: true };
  } catch (error) {
    console.error(`[${Date.now() - startTime}ms] Operation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete table",
    };
  }
}

export async function testLog() {
  console.log("Test server action log");
  return { success: true };
}
