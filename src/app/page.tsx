import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserBases } from "~/lib/actions/bases.action";
import { HomeContent } from "~/components/home/HomeContent";
import { createUser } from "~/lib/actions/users.action";
import { prefetchBaseTables } from "~/lib/query/prefetch";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/query/client";

export const dynamic = "force-dynamic";

async function prefetchAllBasesData(bases: Array<{ id: string }>) {
  // Prefetch all bases in parallel
  await Promise.all(bases.map((base) => prefetchBaseTables(base.id)));
  return getQueryClient();
}

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { success, bases, error } = await getUserBases(userId);

  // If user not found, create them and try again
  if (!success && error === "User not found") {
    // Get user email from Clerk
    const user = await currentUser();
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      throw new Error("No email address found for user");
    }

    // Create user in our database
    const createResult = await createUser({
      clerkId: userId,
      email: user.emailAddresses[0].emailAddress,
    });

    if (!createResult.success) {
      throw new Error("Failed to create user");
    }

    // Try getting bases again
    const retryResult = await getUserBases(userId);
    if (!retryResult.success || !retryResult.bases) {
      throw new Error(retryResult.error ?? "Failed to get user bases");
    }

    const queryClient = await prefetchAllBasesData(retryResult.bases);

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeContent bases={retryResult.bases} />
      </HydrationBoundary>
    );
  }

  if (!success || !bases) {
    throw new Error(error ?? "Failed to get user bases");
  }

  const queryClient = await prefetchAllBasesData(bases);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent bases={bases} />
    </HydrationBoundary>
  );
}
