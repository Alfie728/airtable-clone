import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserBases } from "~/lib/actions/bases.action";
import { HomeContent } from "~/components/home/HomeContent";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { success, bases, error } = await getUserBases(userId);
  if (!success || !bases) {
    throw new Error(error ?? "Failed to get user bases");
  }

  return <HomeContent bases={bases} />;
}
