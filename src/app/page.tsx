import { auth, currentUser } from "@clerk/nextjs/server";
import { HomeContent } from "~/components/home/HomeContent";
import { createUser } from "~/lib/actions/users.action";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/query/client";
import { prefetchBasesList } from "~/lib/query/prefetch";
import { getUserBases } from "~/lib/actions/bases.action";
import type { SerializedBase } from "~/types/base";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const queryClient = getQueryClient();

  // First check if user exists
  const user = await currentUser();
  if (!user?.emailAddresses?.[0]?.emailAddress) {
    throw new Error("No email address found for user");
  }

  // Create user if doesn't exist
  const createResult = await createUser({
    clerkId: userId,
    email: user.emailAddresses[0].emailAddress,
  });

  if (!createResult.success) {
    throw new Error("Failed to create user");
  }

  // Get bases list directly
  const basesData = await getUserBases(userId);
  if (!basesData.success || !basesData.bases) {
    throw new Error(basesData.error ?? "Failed to get user bases");
  }

  // Prefetch for client-side
  await prefetchBasesList(queryClient, userId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent bases={basesData.bases} />
    </HydrationBoundary>
  );
}
