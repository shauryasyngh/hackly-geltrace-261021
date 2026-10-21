"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signIn(fd: FormData) {
  const email = String(fd.get("email") ?? "");
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/confirm` } });
  redirect(error ? `/login?error=${encodeURIComponent(error.message)}` : "/login?sent=1");
}
