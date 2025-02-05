import { db } from "~/server/db";
import { desc, eq } from "drizzle-orm";
import {
  tables,
  columns,
  rows,
  cells,
  views,
  bases,
  users,
} from "~/server/db/schema";
import { auth } from "@clerk/nextjs/server";
import { TopNavigation } from "~/components/layout/TopNavigation";
import { Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

import { SecondaryNavigation } from "~/components/layout/SecondaryNavigation";
import { Sidebar } from "~/components/layout/Sidebar";
import { GridControls } from "~/components/grid/GridControls";
import { DataGrid } from "~/components/grid/DataGrid";

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

  if (!clerkId) {
    return null;
  }

  // First get the user's UUID from the users table
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (!user) {
    return null;
  }

  const userBases = await db
    .select()
    .from(bases)
    .where(eq(bases.userId, user.id))
    .orderBy(desc(bases.createdAt));

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopNavigation showBaseOptions={false} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Your bases</h1>
            <Link
              href="/new-base"
              className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Plus className="h-5 w-5" />
              Create new base
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userBases.map((base) => (
              <Link
                key={base.id}
                href={`/base/${base.id}`}
                className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {base.name}
                  </h3>
                  {base.description && (
                    <p className="mt-2 text-sm text-gray-500">
                      {base.description}
                    </p>
                  )}
                  <div className="mt-4 text-xs text-gray-400">
                    Created {new Date(base.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}

            {userBases.length === 0 && (
              <div className="col-span-full">
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    No bases
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new base
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/new-base"
                      className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <Plus className="h-5 w-5" />
                      Create new base
                    </Link>
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
