import { BaseClient } from "~/components/base/BaseClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBaseById } from "~/lib/actions/bases.action";
import { getTables } from "~/lib/actions/tables.action";
import { getDefaultView } from "~/lib/actions/views.action";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/query/client";
import { queryKeys } from "~/lib/query/keys";
import { getTableViews } from "~/lib/actions/views.action";
import type { SerializedBase } from "~/types/base";
import type { SerializedTable } from "~/types/table";

interface PageProps {
  params: {
    baseId: string;
    tableId: string;
    viewId: string;
  };
}

interface TablesResult {
  success: boolean;
  tables?: SerializedTable[];
  error?: string;
}

interface DefaultViewResult {
  viewId: string | null;
  error?: string;
}

interface ViewsResult {
  success: boolean;
  views?: Array<{
    id: string;
    name: string;
    tableId: string;
    isDefault: boolean;
  }>;
  error?: string;
}

export default async function BasePage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { baseId, tableId, viewId } = await Promise.resolve(params);
  const queryClient = getQueryClient();

  // Get cached data first with proper typing
  const cachedBase = queryClient.getQueryData<SerializedBase>(
    queryKeys.bases.info(baseId),
  );
  const cachedTables = queryClient.getQueryData<TablesResult>(
    queryKeys.bases.tables.list(baseId),
  );
  const cachedDefaultView = queryClient.getQueryData<DefaultViewResult>(
    queryKeys.views.default(tableId),
  );
  const cachedViews = queryClient.getQueryData<ViewsResult>(
    queryKeys.views.list(tableId),
  );

  // Server-side validation with cached or fresh data
  const base = cachedBase ?? (await getBaseById(baseId));
  if (!base) {
    redirect("/not-found");
  }

  const tablesResult = cachedTables ?? (await getTables(baseId));
  if (!tablesResult.success || !tablesResult.tables?.length) {
    redirect("/");
  }

  // Validate that this table belongs to this base
  const table = tablesResult.tables.find((t) => t.id === tableId);
  if (!table) {
    // If table doesn't exist, redirect to first table's default view
    const firstTable = tablesResult.tables[0];
    if (!firstTable) {
      redirect("/");
    }
    const defaultViewResult =
      cachedDefaultView ?? (await getDefaultView(firstTable.id));
    const defaultViewId = defaultViewResult.viewId;
    if (!defaultViewId) {
      redirect("/");
    }
    redirect(`/${baseId}/${firstTable.id}/${defaultViewId}`);
  }

  // Validate viewId
  const defaultViewResult =
    cachedDefaultView ?? (await getDefaultView(tableId));
  const defaultViewId = defaultViewResult.viewId;
  if (!defaultViewId) {
    redirect("/");
  }  

  // Only prefetch what we don't have cached
  const prefetchPromises = [];

  if (!cachedBase) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.bases.info(baseId),
        queryFn: () => Promise.resolve(base),
        staleTime: 30 * 1000,
      }),
    );
  }

  if (!cachedTables) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.bases.tables.list(baseId),
        queryFn: () => Promise.resolve(tablesResult),
        staleTime: 10 * 1000,
      }),
    );
  }

  if (!cachedDefaultView) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.views.default(tableId),
        queryFn: () => Promise.resolve(defaultViewResult),
        staleTime: 5 * 1000,
      }),
    );
  }

  if (!cachedViews) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: queryKeys.views.list(tableId),
        queryFn: async () => {
          const viewsResult = await getTableViews(tableId);
          if (viewsResult.success && viewsResult.views) {
            return viewsResult.views;
          }
          throw new Error(viewsResult.error ?? "Failed to get views");
        },
        staleTime: 5 * 1000,
      }),
    );
  }

  // Wait for any necessary prefetching
  if (prefetchPromises.length > 0) {
    await Promise.all(prefetchPromises);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BaseClient baseId={baseId} tableId={tableId} viewId={viewId} />
    </HydrationBoundary>
  );
}
