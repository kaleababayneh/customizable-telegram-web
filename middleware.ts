import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  // If the user is not logged in and trying to access protected routes
  if (!sessionToken && !request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // If the user is logged in and trying to access auth pages
  if (sessionToken && request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chats/:path*", "/auth/:path*", "/"],
};
