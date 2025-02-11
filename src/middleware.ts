import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Add logging for both development and production
  console.log("[Middleware] Path:", request.nextUrl.pathname);
  console.log("[Middleware] Is public:", isPublicRoute(request));

  if (!isPublicRoute(request)) {
    const authState = await auth();
    console.log("[Middleware] Auth state:", authState);

    // If user is not authenticated and trying to access a protected route
    if (!authState.userId) {
      const signInUrl = new URL("/sign-in", request.url);
      return Response.redirect(signInUrl);
    }

    await auth.protect();
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
