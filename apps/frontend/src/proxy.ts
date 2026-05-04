import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user) {
    if (isPublic) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isTeacher = profile?.role === "TEACHER";

  if (isTeacher && pathname.startsWith("/s")) {
    return NextResponse.redirect(
      new URL(pathname.replace(/^\/s/, "/t"), request.url)
    );
  }

  if (!isTeacher && pathname.startsWith("/t")) {
    return NextResponse.redirect(
      new URL(pathname.replace(/^\/t/, "/s"), request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
