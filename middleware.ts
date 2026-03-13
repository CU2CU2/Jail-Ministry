import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register"];
const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];
const LEADER_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR", "TEAM_LEADER"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Require authentication for all other paths
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role as string;

  // Restrict /admin paths to coordinators and above
  if (pathname.startsWith("/admin") && !ADMIN_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Restrict /visits/[id]/attendance to team leaders and above
  if (pathname.includes("/attendance") && !LEADER_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
