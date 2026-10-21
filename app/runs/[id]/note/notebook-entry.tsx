"use client";

import { useRef, useState } from "react";
import type { GelRun } from "@/lib/gel-run";
import type { Notebook, NoteEvidence } from "@/lib/notebook";
import EvidenceCrop from "@/app/evidence-crop";

export default function NotebookEntry({ run, notebook }: { run: GelRun; notebook: Notebook }) {
  const [activeEvidence, setActiveEvidence] = useState<NoteEvidence>(notebook.sample);
  const [copyState, setCopyState] = useState<"idle" | "pending" | "copied" | "manual">("idle");
  const manualCopy = useRef<HTMLTextAreaElement>(null);

  function showEvidence(evidence: NoteEvidence) {
    setActiveEvidence(evidence);
    requestAnimationFrame(() => {
      const panel = document.getElementById("note-evidence");
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  async function copyNote() {
    setCopyState("pending");
    try {
      await navigator.clipboard.writeText(notebook.text);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
      requestAnimationFrame(() => manualCopy.current?.select());
    }
  }

  return (
    <article className="notebook-panel lab-notebook" aria-labelledby="note-title">
      <header className="note-header">
        <div>
          <p className="eyebrow">Write the observation / 02</p>
          <h1 id="note-title">{run.title}</h1>
          <p className="note-subtitle">Rule-based lab-note draft · for human review</p>
        </div>
        <div className="note-provenance">
          <span className="demo-label">Synthetic demo image</span>
          <p>{notebook.sourceLabel}</p>
        </div>
      </header>

      <div className="note-body">
        <div className="note-writing">
          <section aria-labelledby="observations-title">
            <h2 id="observations-title">Observations</h2>
            <p className="note-instruction">Choose a sentence to follow its image evidence.</p>
            <button type="button" className="note-observation" aria-pressed={activeEvidence.band.id === notebook.sample.band.id} onClick={() => showEvidence(notebook.sample)}>
              {notebook.sample.lane.label}: estimated {notebook.estimate.roundedBp} bp <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="note-observation" aria-pressed={activeEvidence.band.id === notebook.target.band.id} onClick={() => showEvidence(notebook.target)}>
              target: {run.target_bp} bp <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="note-observation" aria-pressed={activeEvidence.band.id === notebook.control.band.id} onClick={() => showEvidence(notebook.control)}>
              negative control: faint band detected <span aria-hidden="true">↗</span>
            </button>
            <p className="note-control-caveat">Seeded review flag. No automatic detection or confirmed contamination.</p>
            <p className="note-calibration">The sample band is at y = {notebook.sample.band.y_center} px. Its size is calculated by logarithmic interpolation between <button type="button" className="text-button" onClick={() => showEvidence(notebook.upper)}>{notebook.upper.band.reference_bp} bp at y = {notebook.upper.band.y_center} px</button> and <button type="button" className="text-button" onClick={() => showEvidence(notebook.lower)}>{notebook.lower.band.reference_bp} bp at y = {notebook.lower.band.y_center} px</button>.</p>
          </section>

          <section className="note-conclusion" aria-labelledby="conclusion-title">
            <h2 id="conclusion-title">Conclusion</h2>
            <p>{notebook.conclusion}</p>
          </section>

          <section className="note-limitations" aria-labelledby="limitations-title">
            <h2 id="limitations-title">Limitations</h2>
            <ul>{notebook.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          </section>
        </div>

        <aside id="note-evidence" className="note-evidence" tabIndex={-1} aria-labelledby="note-evidence-title">
          <p className="eyebrow">Linked image evidence</p>
          <h2 id="note-evidence-title">{activeEvidence.label}</h2>
          <EvidenceCrop run={run} lane={activeEvidence.lane} band={activeEvidence.band} />
          <p className="note-evidence-caption">{activeEvidence.band.evidence_label}</p>
          <svg className="note-context" viewBox={`0 0 ${run.image_width} ${run.image_height}`} role="img" aria-label={`Evidence location in the demo gel: ${activeEvidence.lane.label}, y = ${activeEvidence.band.y_center} px`}>
            <image href={run.image_path} width={run.image_width} height={run.image_height} />
            <rect x={activeEvidence.lane.x_left + 3} y={activeEvidence.band.y_center - activeEvidence.band.band_height / 2 - 3} width={activeEvidence.lane.x_right - activeEvidence.lane.x_left - 6} height={activeEvidence.band.band_height + 6} rx="2" />
          </svg>
          <p className="note-context-label">Outlined location in the full synthetic gel.</p>
        </aside>
      </div>

      <footer className="note-footer">
        <p>Rule-based draft from the saved demo positions.<br />Review the evidence and limitations before using this note.</p>
        <div>
          <button type="button" className="primary-action" disabled={copyState === "pending"} onClick={copyNote}>{copyState === "pending" ? "Copying…" : "Copy lab note"}</button>
          <p className="copy-status" role="status">{copyState === "copied" ? "Copied lab note, including evidence and limitations." : copyState === "manual" ? "Clipboard unavailable. The note text below is selected for manual copying." : ""}</p>
        </div>
      </footer>
      {copyState === "manual" && <div className="manual-copy"><label htmlFor="manual-note-copy">Lab-note text for manual copying</label><textarea id="manual-note-copy" ref={manualCopy} readOnly value={notebook.text} rows={14} /></div>}
    </article>
  );
}
