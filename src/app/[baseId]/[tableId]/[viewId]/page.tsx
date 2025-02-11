import { BaseClient } from "~/components/base/BaseClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

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

  const { baseId, tableId, viewId } = await Promise.resolve(params);

  return <BaseClient baseId={baseId} tableId={tableId} viewId={viewId} />;
}
