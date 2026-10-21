import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// refreshes the supabase session cookie on every request so server components see a live user.
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => {
        for (const { name, value } of all) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of all) res.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser().catch(() => null);
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
