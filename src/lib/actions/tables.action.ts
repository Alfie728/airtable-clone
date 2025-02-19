"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { tables, columns, rows, cells, views } from "~/server/db/schema";
import { eq, and, sql, desc, or, inArray, asc, type SQL } from "drizzle-orm";
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
import type { SortingState } from "@tanstack/react-table";

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

    // Create default columns
    const defaultColumns = [
      { name: "Name", type: "text" as const, order: 0 },
      { name: "Notes", type: "text" as const, order: 1 },
      { name: "Email", type: "text" as const, order: 2 },
      { name: "Phone", type: "text" as const, order: 3 },
      { name: "Company", type: "text" as const, order: 4 },
      { name: "City", type: "text" as const, order: 5 },
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

export async function getTableDataWithSort(params: {
  tableId: string;
  tableName: string;
  sorting?: SortingState;
  page?: number;
  pageSize?: number;
}) {
  const { tableId, tableName, sorting = [], page = 1, pageSize = 250 } = params;

  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // Get all columns for this table (common for both cases)
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    // Get total count (common for both cases)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(rows)
      .where(eq(rows.tableId, tableId));

    const totalCount = countResult[0]?.count ?? 0;
    const offset = (page - 1) * pageSize;

    // If sorting is requested, use the sorting logic
    if (sorting.length > 0) {
      const sortCases = sorting
        .map((sort) => {
          const column = tableColumns.find((col) => col.id === sort.id);
          if (!column) return undefined;

          return sort.desc
            ? sql`MAX(CASE WHEN c.column_id = ${column.id} THEN c.value END) DESC NULLS LAST`
            : sql`MAX(CASE WHEN c.column_id = ${column.id} THEN c.value END) ASC NULLS LAST`;
        })
        .filter((x): x is SQL<unknown> => x !== undefined);

      // Use the CTE approach for sorted data
      const { rows: sortedRows } = await db.execute<QueryResult>(sql`
        WITH sorted_rows AS (
          SELECT r.id, r.order, ROW_NUMBER() OVER (
            ORDER BY ${sql.join(sortCases, sql`, `)}, r.order ASC
          ) as row_num
          FROM "airtable-clone_rows" r
          LEFT JOIN "airtable-clone_cells" c ON c.row_id = r.id
          WHERE r.table_id = ${tableId}
          GROUP BY r.id, r.order
        )
        SELECT r.id as row_id, r.order as row_order, c.id as cell_id, c.column_id, c.value
        FROM sorted_rows sr
        JOIN "airtable-clone_rows" r ON r.id = sr.id
        LEFT JOIN "airtable-clone_cells" c ON c.row_id = r.id
        WHERE sr.row_num > ${offset} AND sr.row_num <= ${offset + pageSize}
        ORDER BY sr.row_num;
      `);

      return transformResults(sortedRows, tableColumns, tableId, tableName, {
        total: totalCount,
        page,
        pageSize,
        hasMore: offset + sortedRows.length / tableColumns.length < totalCount,
      });
    }

    // For unsorted data, use the chunked approach
    const paginatedRows = await db
      .select()
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(rows.order)
      .offset(offset)
      .limit(pageSize);

    const CHUNK_SIZE = 50;
    const allRowsWithCells = [];

    for (let i = 0; i < paginatedRows.length; i += CHUNK_SIZE) {
      const chunk = paginatedRows.slice(i, i + CHUNK_SIZE);
      const chunkIds = chunk.map((r) => r.id);

      const rowsWithCells = await db
        .select({
          row: rows,
          cell: cells,
        })
        .from(rows)
        .where(and(eq(rows.tableId, tableId), inArray(rows.id, chunkIds)))
        .leftJoin(cells, eq(cells.rowId, rows.id))
        .orderBy(rows.order);

      allRowsWithCells.push(...rowsWithCells);
    }

    return transformResults(
      allRowsWithCells.map((record) => ({
        row_id: record.row.id,
        row_order: record.row.order,
        cell_id: record.cell?.id ?? null,
        column_id: record.cell?.columnId ?? null,
        value: record.cell?.value ?? null,
      })),
      tableColumns,
      tableId,
      tableName,
      {
        total: totalCount,
        page,
        pageSize,
        hasMore: offset + paginatedRows.length < totalCount,
      },
    );
  } catch (error) {
    console.error("[getTableDataWithSort] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get table data",
    };
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
      // Get the exact value from the optimistic row using column ID
      const value = optimisticRow[column.id]?.toString() ?? "";

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
    console.log("Starting addBulkRows with:", {
      tableId,
      rowCount: optimisticRows.length,
    });

    const ROW_CHUNK_SIZE = 1000;
    const CELL_CHUNK_SIZE = 100; // Smaller chunk size for cells to avoid parameter size limits
    const tableColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.tableId, tableId))
      .orderBy(columns.order);

    console.log(
      "Found columns:",
      tableColumns.map((c) => ({ id: c.id, name: c.name })),
    );

    const lastRow = await db
      .select({ order: rows.order })
      .from(rows)
      .where(eq(rows.tableId, tableId))
      .orderBy(desc(rows.order))
      .limit(1);

    const startOrder = (lastRow[0]?.order ?? 0) + 1;
    const allNewRows = [];

    // Process rows in chunks
    for (let i = 0; i < optimisticRows.length; i += ROW_CHUNK_SIZE) {
      const chunk = optimisticRows.slice(i, i + ROW_CHUNK_SIZE);
      console.log("Processing row chunk:", {
        chunkSize: chunk.length,
        firstRow: chunk[0],
        sampleColumnValues: tableColumns.map((col) => ({
          columnId: col.id,
          value: chunk[0]?.[col.id],
        })),
      });

      // Insert chunk of rows
      const rowsToInsert = chunk.map((row, index) => ({
        id: String(row.id),
        tableId,
        order: startOrder + i + index,
      }));

      const newRows = await db.insert(rows).values(rowsToInsert).returning();
      console.log(
        "Inserted rows:",
        newRows.map((r) => ({ id: r.id, order: r.order })),
      );

      // Merge server and client data
      const mergedRows = newRows.map((newRow, idx) => ({
        ...newRow,
        ...chunk[idx],
      }));
      allNewRows.push(...mergedRows);

      // Generate all cells for this chunk
      const allCellsForChunk = newRows.flatMap((row, rowIndex) =>
        tableColumns.map((column) => {
          const optimisticRow = chunk[rowIndex] ?? {};
          const value = optimisticRow[column.id]?.toString() ?? "";
          return {
            rowId: row.id,
            columnId: column.id,
            value,
            displayValue: value,
            searchVector: sql`to_tsvector(${value})`,
          };
        }),
      );

      // Insert cells in smaller sub-chunks
      for (let j = 0; j < allCellsForChunk.length; j += CELL_CHUNK_SIZE) {
        const cellSubChunk = allCellsForChunk.slice(j, j + CELL_CHUNK_SIZE);
        console.log("Inserting cell sub-chunk:", {
          start: j,
          end: j + CELL_CHUNK_SIZE,
          chunkSize: cellSubChunk.length,
        });
        await db.insert(cells).values(cellSubChunk);
      }
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
  } catch (error) {
    console.error("Error in addBulkRows:", error);
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

type QueryResult = {
  row_id: string;
  row_order: number;
  cell_id: string | null;
  column_id: string | null;
  value: string | null;
};

function transformResults(
  rows: QueryResult[],
  tableColumns: (typeof columns.$inferSelect)[],
  tableId: string,
  tableName: string,
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  },
) {
  const gridData: Row[] = [];
  const rowDataMap = new Map<string, Row>();

  for (const record of rows) {
    if (!rowDataMap.has(record.row_id)) {
      const newRow: Row = {
        id: record.row_id,
        order: record.row_order,
      };
      rowDataMap.set(record.row_id, newRow);
      gridData.push(newRow);
    }

    if (record.column_id) {
      const column = tableColumns.find((col) => col.id === record.column_id);
      if (column) {
        const row = rowDataMap.get(record.row_id)!;
        row[column.id] =
          column.type === "number"
            ? Number(record.value) || 0
            : (record.value ?? "");
      }
    }
  }

  return {
    success: true,
    table: {
      id: tableId,
      name: tableName,
      columns: tableColumns.map((col) => ({
        id: col.id,
        name: col.name,
        type: col.type,
        order: col.order,
        width: col.width,
        isSearchable: col.isSearchable,
        isSortable: col.isSortable,
        isVisible: col.isVisible,
      })),
      data: gridData,
      pagination,
    },
  };
}
