import { auth, currentUser } from "@clerk/nextjs/server";
import { HomeContent } from "~/components/home/HomeContent";
import { createUser } from "~/lib/actions/users.action";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/query/client";
import { prefetchBasesList } from "~/lib/query/prefetch";
import type { SerializedBase } from "~/lib/actions/bases.action";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const queryClient = getQueryClient();

  // Try to prefetch bases list
  await prefetchBasesList(queryClient, userId);
  const basesData = queryClient.getQueryData<{
    success: boolean;
    bases?: SerializedBase[];
    error?: string;
  }>(["bases", "list"]);

  // If user not found, create them and try again
  if (!basesData?.success && basesData?.error === "User not found") {
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

    // Try prefetching bases again
    await prefetchBasesList(queryClient, userId);
    const retryBasesData = queryClient.getQueryData<{
      success: boolean;
      bases?: SerializedBase[];
      error?: string;
    }>(["bases", "list"]);
    if (!retryBasesData?.success || !retryBasesData.bases) {
      throw new Error(retryBasesData?.error ?? "Failed to get user bases");
    }

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeContent bases={retryBasesData.bases} />
      </HydrationBoundary>
    );
  }

  if (!basesData?.success || !basesData.bases) {
    throw new Error(basesData?.error ?? "Failed to get user bases");
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent bases={basesData.bases} />
    </HydrationBoundary>
  );
}
