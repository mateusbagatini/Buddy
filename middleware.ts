import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If there's no session and the request is for a protected route, redirect to login
  const isProtectedRoute = req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/user")

  if (!session && isProtectedRoute) {
    const redirectUrl = new URL("/login-fix", req.url)
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Make sure the middleware is not blocking access to the users page
// Check the matcher configuration and ensure it includes the users path

export const config = {
  matcher: ["/admin/:path*", "/user/:path*", "/fix-action-flows-table"],
}
