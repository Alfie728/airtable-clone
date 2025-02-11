import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const authState = await auth();

  // Detailed logging without trying to modify headers
  console.log("[Middleware] Request details:", {
    path: request.nextUrl.pathname,
    isPublic: isPublicRoute(request),
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  console.log("[Middleware] Auth state:", {
    userId: authState.userId,
    sessionId: authState.sessionId,
    isSignedIn: !!authState.userId,
    hasSession: !!authState.sessionId,
  });

  if (!isPublicRoute(request)) {
    console.log("[Middleware] Protecting route:", request.nextUrl.pathname);
    try {
      await auth.protect();
      console.log("[Middleware] Route protected, auth check complete");
    } catch (error) {
      console.error("[Middleware] Auth protection failed:", error);
      // Create a new URL for the redirect
      const signInUrl = new URL("/sign-in", request.url);
      return Response.redirect(signInUrl);
    }
  } else {
    console.log(
      "[Middleware] Public route accessed:",
      request.nextUrl.pathname,
    );
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
