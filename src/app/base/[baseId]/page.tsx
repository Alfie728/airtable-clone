import { BaseClient } from "./BaseClient";
import { prefetchTable } from "~/hooks/useTable";
import { getTables } from "~/lib/actions/tables.action";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface PageProps {
  params: {
    baseId: string;
  };
}

export default async function BasePage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { baseId } = await Promise.resolve(params);

  // Get initial tables to find the first table ID
  const { success, tables } = await getTables(baseId);
  if (!success) {
    redirect("/");
  }

  const initialTableId = tables?.[0]?.id ?? "";

  // Prefetch data
  const queryClient = await prefetchTable(baseId, initialTableId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BaseClient baseId={baseId} />
    </HydrationBoundary>
  );
}
