import { BaseClient } from "~/components/base/BaseClient";
import { getTables } from "~/lib/actions/tables.action";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getQueryClient } from "~/lib/query/client";
import type { TableResponse } from "~/hooks/useTable";
import type { tables } from "~/server/db/schema";

interface TablesResponse {
  success: boolean;
  tables?: Array<typeof tables.$inferSelect>;
  error?: string;
}

interface PageProps {
  params: {
    baseId: string;
    tableId: string;
    viewId: string;
  };
}

export default async function BasePage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { baseId, tableId, viewId } = params;
  console.log("Accessing base:", baseId, "table:", tableId, "view:", viewId);

  // Use the shared query client
  const queryClient = getQueryClient();

  // First try to get data from cache
  let tablesResponse = queryClient.getQueryData<TablesResponse>([
    "base",
    baseId,
  ]);

  // If not in cache, then fetch
  if (!tablesResponse) {
    tablesResponse = await queryClient.fetchQuery({
      queryKey: ["base", baseId],
      queryFn: () => getTables(baseId),
    });
  }

  if (!tablesResponse?.success) {
    redirect("/");
  }

  // Verify that the table exists in this base
  const tableExists = tablesResponse.tables?.some((t) => t.id === tableId);
  if (!tableExists) {
    // If table doesn't exist, redirect to the first table
    const firstTableId = tablesResponse.tables?.[0]?.id;
    if (firstTableId) {
      redirect(`/${baseId}/${firstTableId}/grid`);
    }
    redirect("/");
  }

  // Get the table data from cache since it was prefetched on homepage
  const initialTableData = queryClient.getQueryData<TableResponse>([
    "table",
    tableId,
  ]);

  return (
    <BaseClient
      baseId={baseId}
      initialTableData={initialTableData}
      initialTableId={tableId}
      viewId={viewId}
    />
  );
}
