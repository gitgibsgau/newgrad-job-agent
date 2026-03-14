import { NextResponse } from "next/server";

export function middleware(request) {
  // Allow the validate endpoint through without a code
  if (request.nextUrl.pathname.startsWith("/api/validate")) {
    return NextResponse.next();
  }

  const code = request.headers.get("x-access-code");
  if (!code || code !== process.env.ACCESS_CODE) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
