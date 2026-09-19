import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Lets the root layout know which page it's rendering (layouts can't read
  // the URL) so admin-configured head scripts can skip /admin, /dashboard and
  // auth pages. Always overwritten here, so a client-supplied x-pathname
  // header can never reach the layout.
  request.headers.set("x-pathname", request.nextUrl.pathname);
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - common static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
