import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { isAdminEmail } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Cache-Control: no-store etc. — stops a CDN from serving one user's session cookie to another.
          Object.assign(pendingHeaders, headers);
        },
      },
    },
  );

  // Must run before any other logic: verifies the JWT and refreshes an expiring session.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isRealUser = claims && !claims.is_anonymous;
    if (!isRealUser || !isAdminEmail(claims.email)) {
      const url = request.nextUrl.clone();
      url.pathname = isRealUser ? "/" : "/login";
      url.search = isRealUser ? "" : `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
      const redirect = NextResponse.redirect(url);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      response = redirect;
    }
  }

  for (const [key, value] of Object.entries(pendingHeaders)) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the Stripe webhook (it has no user session).
    "/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
