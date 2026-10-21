import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// server components, route handlers and server actions. reads the session from cookies.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        // server components cannot set cookies; proxy.ts refreshes the session instead
        try { for (const { name, value, options } of all) store.set(name, value, options); } catch {}
      },
    },
  });
}
