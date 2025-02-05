import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { bases, tables, columns, rows, cells } from "~/server/db/schema";
import { TopNavigation } from "~/components/layout/TopNavigation";
import { getUserByClerkId } from "~/lib/actions/users.action";
import { DataGrid } from "~/components/grid/DataGrid";
import { GridControls } from "~/components/grid/GridControls";
import { Sidebar } from "~/components/layout/Sidebar";

export const dynamic = "force-dynamic";

interface BasePageProps {
  params: {
    baseId: string;
  };
}

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

async function getTableData(
  tableId: string,
  tableName: string,
): Promise<TableData | null> {
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
  const gridData: GridRow[] = tableRows.map((row, rowIndex) => {
    const rowData: GridRow = { id: row.id };
    const rowCells = tableCells[rowIndex];
    if (rowCells) {
      rowCells.forEach((cell) => {
        const column = tableColumns.find((col) => col.id === cell.columnId);
        if (column) {
          rowData[column.name.toLowerCase().replace(/\s+/g, "_")] = cell.value;
        }
      });
    }
    return rowData;
  });

  return {
    id: tableId,
    name: tableName,
    columns: tableColumns,
    data: gridData,
  };
}

async function getBase(baseId: string, userId: string) {
  const { success, user } = await getUserByClerkId(userId);
  if (!success || !user) return null;

  const [base] = await db
    .select()
    .from(bases)
    .where(eq(bases.id, baseId))
    .limit(1);

  if (!base || base.userId !== user.id) return null;

  const baseTables = await db
    .select()
    .from(tables)
    .where(eq(tables.baseId, baseId));

  // Get data for the first table if it exists
  let firstTableData = null;
  const firstTable = baseTables[0];
  if (firstTable?.id && firstTable?.name) {
    firstTableData = await getTableData(firstTable.id, firstTable.name);
  }

  return {
    ...base,
    tables: baseTables,
    currentTable: firstTableData,
  };
}

export default async function BasePage({ params }: BasePageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const { baseId } = await Promise.resolve(params);
  const base = await getBase(baseId, userId);
  if (!base) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNavigation showBaseOptions baseName={base.name} />
      <main className="flex-1">
        <div className="flex h-full">
          <Sidebar tables={base.tables} />
          <div className="flex-1">
            <GridControls />
            {base.currentTable ? (
              <div className="space-y-8 p-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">
                    {base.currentTable.name}
                  </h2>
                  <DataGrid data={base.currentTable.data} />
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-gray-900">
                    No tables
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new table
                  </p>
                  <div className="mt-6">
                    <button className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                      Create table
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
