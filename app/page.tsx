import { loadDemoRun } from "@/lib/gel-run";
import GelWorkspace from "./gel-workspace";

export default async function Home() {
  const { run, source } = await loadDemoRun();
  return (
    <main className="workspace">
      <header className="workspace-header">
        <a className="wordmark" href="/" aria-label="geltrace home">geltrace</a>
        <span className="eyebrow">Gel bands &amp; controls</span>
      </header>
      <GelWorkspace run={run} source={source} />
    </main>
  );
}
