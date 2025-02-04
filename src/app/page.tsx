import { db } from "~/server/db";
import { desc, eq } from "drizzle-orm";
import { tables, columns, rows, cells, views, bases } from "~/server/db/schema";

export const dynamic = "force-dynamic";

import { TopNavigation } from "~/components/layout/TopNavigation";
import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { Sidebar } from "~/components/layout/Sidebar";
import { GridControls } from "~/components/grid/GridControls";
import { DataGrid } from "~/components/grid/DataGrid";
import { auth } from "@clerk/nextjs/server";

interface GridRow {
  id: string;
  [key: string]: string | number;
}

interface TableColumn {
  id: string;
  name: string;
  type: "text" | "number";
  order: number;
  width: number;
  isSearchable: boolean;
  isSortable: boolean;
  isVisible: boolean;
}

interface TableData {
  id: string;
  name: string;
  columns: TableColumn[];
  data: GridRow[];
}

async function getBaseData(baseId: string): Promise<TableData[] | null> {
  // Get all tables for this base
  const baseTables = await db
    .select()
    .from(tables)
    .where(eq(tables.baseId, baseId))
    .orderBy(tables.createdAt);

  if (baseTables.length === 0) return null;

  // Get data for each table
  const tablesData = await Promise.all(
    baseTables.map(async (table) => {
      // Get all columns for this table
      const tableColumns = await db
        .select()
        .from(columns)
        .where(eq(columns.tableId, table.id))
        .orderBy(columns.order);

      // Get all rows for this table
      const tableRows = await db
        .select()
        .from(rows)
        .where(eq(rows.tableId, table.id))
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
      const gridData: GridRow[] = tableRows.map((row, rowIndex) => {
        const rowData: GridRow = { id: row.id };
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

      return {
        id: table.id,
        name: table.name,
        columns: tableColumns,
        data: gridData,
      };
    }),
  );

  return tablesData;
}

export default async function Page() {
  const { userId: clerkId } = await auth();
  // For now, we'll use the first base in the database
  const [firstBase] = await db.select().from(tables).limit(1);
  if (!firstBase) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNavigation />
        <SecondaryNavigation />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1">
            <GridControls />
            <div className="p-4">
              <p>
                No tables found. Please run db:seed to populate the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get base details
  const [baseDetails] = await db
    .select()
    .from(bases)
    .where(eq(bases.id, firstBase.baseId));

  const baseData = await getBaseData(firstBase.baseId);

  if (!baseData) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNavigation baseName={baseDetails?.name} />
        <SecondaryNavigation />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1">
            <GridControls />
            <div className="p-4">
              <p>No data found in this base.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNavigation baseName={baseDetails?.name} />
      <SecondaryNavigation />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1">
          <GridControls />
          <div className="space-y-8 p-4">
            {baseData.map((table) => (
              <div key={table.id} className="space-y-2">
                <h2 className="text-lg font-semibold">{table.name}</h2>
                <DataGrid data={table.data} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
