import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const authState = await auth();

  // Detailed logging of the request and auth state
  console.log("[Middleware] Request details:", {
    path: request.nextUrl.pathname,
    isPublic: isPublicRoute(request),
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
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
      // Log the redirect attempt
      console.log("[Middleware] Redirecting to:", "/sign-in");
      return Response.redirect(new URL("/sign-in", request.url));
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
