import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_RUN_ID, loadDemoRun } from "@/lib/gel-run";
import { buildNotebook } from "@/lib/notebook";
import NotebookEntry from "./notebook-entry";

export const metadata = { title: "gel run 07 · lab-note draft | geltrace" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== DEMO_RUN_ID) notFound();
  const { run, source } = await loadDemoRun();
  const notebook = buildNotebook(run, source);

  return (
    <main className="workspace notebook-workspace">
      <header className="workspace-header">
        <Link className="wordmark" href="/" aria-label="geltrace home">geltrace</Link>
        <Link className="text-button" href="/">← Back to gel</Link>
      </header>
      {notebook ? <NotebookEntry run={run} notebook={notebook} /> : (
        <section className="notebook-panel">
          <h1>{run.title}</h1>
          <p>The saved measurements or control evidence are incomplete. A lab-note draft cannot be prepared.</p>
          <Link href="/">Return to the gel workspace</Link>
        </section>
      )}
    </main>
  );
}
