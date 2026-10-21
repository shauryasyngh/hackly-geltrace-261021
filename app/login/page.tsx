import { signIn } from "./actions";

// magic link sign in. supabase emails a link that lands on /auth/confirm.
export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <main className="p-8 max-w-sm">
      <h1 className="text-2xl font-bold">sign in</h1>
      {sent ? (
        <p className="mt-4">check your email for the link.</p>
      ) : (
        <form action={signIn} className="mt-4 flex flex-col gap-3">
          <input name="email" type="email" required placeholder="you@example.com" className="border p-2" />
          <button className="border p-2">send magic link</button>
          {error && <p className="text-red-600">{error}</p>}
        </form>
      )}
    </main>
  );
}
