"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GelRun } from "@/lib/gel-run";
import { estimateBandSize } from "@/lib/calibration";
import LaneTrace from "./lane-trace";
import EvidenceCrop from "./evidence-crop";

export default function GelWorkspace({ run, source }: { run: GelRun; source: "saved" | "bundled" }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeBandId, setActiveBandId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const selected = run.lanes.find((lane) => lane.id === selectedId);
  const ladder = run.lanes.find((lane) => lane.role === "ladder");
  const references = ladder?.bands.filter((band) => band.reference_bp !== null) ?? [];
  const measurements = selected?.role !== "ladder" ? selected?.bands.map((band) => ({ band, estimate: estimateBandSize(band.y_center, references) })) ?? [] : [];
  const primary = measurements[0];
  const linkedReferenceIds = new Set(primary?.estimate ? [primary.estimate.upper.id, primary.estimate.lower.id] : []);
  const targetReference = references.find((band) => band.reference_bp === run.target_bp);
  const negativeLane = run.lanes.find((lane) => lane.role === "negative");
  const controlFlags = negativeLane?.bands.filter((band) => band.evidence_label.includes("seeded review flag")) ?? [];
  const evidenceLane = run.lanes.find((lane) => lane.bands.some((band) => band.id === activeBandId));
  const evidenceBand = evidenceLane?.bands.find((band) => band.id === activeBandId);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  function openEvidence(bandId: string) {
    setActiveBandId(bandId);
    requestAnimationFrame(() => {
      const evidence = document.getElementById("image-evidence");
      evidence?.focus({ preventScroll: true });
      evidence?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function selectLane(laneId: string) {
    setSelectedId(laneId);
    setActiveBandId(null);
  }

  return (
    <>
      <section className="run-heading" aria-labelledby="run-title">
        <div>
          <p className="eyebrow">{preview ? "Local image / preview only" : "Follow the band / 01"}</p>
          <h1 id="run-title">{preview ? "Image preview" : run.title}</h1>
          <p>{preview ? "New images are not measured in this demo." : "One gel. Five lanes. Start with the controls."}</p>
        </div>
        <div className="run-meta">
          <span className="demo-label">{preview ? "Unmeasured image" : "Synthetic demo image"}</span>
          {preview ? <p>Preview stays in this browser.</p> : <>
            <p>{source === "saved" ? "Saved demo run" : "Bundled demo copy"} · {run.image_width} × {run.image_height} px</p>
            {source === "bundled" && <p className="source-note">Saved run unavailable; showing the matching bundled fixture.</p>}
          </>}
        </div>
      </section>

      <section className="upload-controls" aria-label="Preview your own image">
        <div>
          <label htmlFor="image-upload">Preview your own image</label>
          <p>New images are not measured in this demo. Preview stays in this browser.</p>
        </div>
        <input id="image-upload" type="file" accept="image/*" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/")) { setPreviewError("Choose an image file to preview."); return; }
          setPreviewError("");
          setSelectedId(null);
          setActiveBandId(null);
          setPreview({ url: URL.createObjectURL(file), name: file.name });
        }} />
      </section>
      {previewError && <p className="preview-error" role="alert">{previewError}</p>}

      {preview ? (
        <section className="notebook-panel upload-preview" aria-labelledby="preview-title">
          <div className="preview-heading">
            <div><p className="eyebrow">Preview only / no measurements</p><h2 id="preview-title">{preview.name}</h2></div>
            <button type="button" className="text-button" onClick={() => { setPreview(null); setPreviewError(""); }}>Return to demo run</button>
          </div>
          <p>New images are not measured in this demo. Return to the demo run to explore its saved measurements and evidence.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={`Unmeasured preview: ${preview.name}`} onError={() => setPreviewError("This image could not be displayed. Choose another image or return to the demo run.")} />
        </section>
      ) : <div className="gel-layout">
        <section className="notebook-panel gel-panel" aria-labelledby="gel-title">
          <div className="panel-heading">
            <h2 id="gel-title">Read the gel</h2>
            <span className="eyebrow">Click a lane to inspect</span>
          </div>
          <div className="lane-tabs" aria-label="Gel lanes">
            {run.lanes.map((lane) => (
              <button key={lane.id} type="button" aria-pressed={selectedId === lane.id} onClick={() => selectLane(lane.id)}>
                <span className="lane-number">0{lane.lane_number}</span>
                <span>{lane.label}</span>
              </button>
            ))}
          </div>

          <figure className="gel-figure">
            <div className="gel-with-ruler">
              <svg className="calibration-ruler" viewBox={`0 0 48 ${run.image_height}`} preserveAspectRatio="none" role="img" aria-label="Calibration ruler: ladder reference sizes in base pairs">
                <line x1="46" x2="46" y1="48" y2="310" />
                {references.map((band) => (
                  <g key={band.id} className={linkedReferenceIds.has(band.id) ? "ruler-reference is-linked" : "ruler-reference"}>
                    <line x1="32" x2="46" y1={band.y_center} y2={band.y_center} />
                    <text x="28" y={band.y_center + 3} textAnchor="end">{band.reference_bp}</text>
                  </g>
                ))}
                <text x="28" y="321" textAnchor="end">bp</text>
              </svg>
              <div className="gel-canvas">
                {/* A plain image preserves the exact pixel coordinates used by the evidence. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="gel-image" src={run.image_path} width={run.image_width} height={run.image_height} alt="Synthetic demo gel run 07: ladder, positive control, faint negative control, sample a and sample b." />
                <div className="lane-overlays" aria-label="Select a lane on the gel image">
                  {run.lanes.map((lane) => (
                    <button
                      key={lane.id}
                      type="button"
                      className={`lane-outline${selectedId === lane.id ? " is-selected" : ""}`}
                      style={{ left: `${lane.x_left / run.image_width * 100}%`, width: `${(lane.x_right - lane.x_left) / run.image_width * 100}%`, top: `${44 / run.image_height * 100}%`, height: `${268 / run.image_height * 100}%` }}
                      aria-label={`Select lane ${lane.lane_number}: ${lane.label}`}
                      aria-pressed={selectedId === lane.id}
                      onClick={() => selectLane(lane.id)}
                    />
                  ))}
                </div>
                {selected && ladder && primary?.estimate && (
                  <svg className="measurement-overlay" viewBox={`0 0 ${run.image_width} ${run.image_height}`} role="img" aria-label={`Estimated size: ${primary.estimate.roundedBp} bp, linked to ${primary.estimate.upper.reference_bp} and ${primary.estimate.lower.reference_bp} bp ladder references`}>
                    {([primary.estimate.upper, primary.estimate.lower]).map((reference) => (
                      <g key={reference.id} id={`ladder-ref-${reference.id}`} className="linked-reference" data-reference-bp={reference.reference_bp}>
                        <rect x={ladder.x_left + 4} y={reference.y_center - reference.band_height / 2 - 3} width={ladder.x_right - ladder.x_left - 8} height={reference.band_height + 6} rx="3" />
                        <text x={ladder.x_right + 5} y={reference.y_center === primary.estimate!.upper.y_center ? reference.y_center - 10 : reference.y_center + 19}>{reference.reference_bp} bp</text>
                      </g>
                    ))}
                    <path className="ladder-bracket" d={`M ${ladder.x_right + 2} ${primary.estimate.upper.y_center} Q ${ladder.x_right + 23} ${primary.estimate.upper.y_center - 2} ${ladder.x_right + 21} ${primary.estimate.upper.y_center + 7} L ${ladder.x_right + 21} ${primary.estimate.lower.y_center - 7} Q ${ladder.x_right + 22} ${primary.estimate.lower.y_center + 2} ${ladder.x_right + 2} ${primary.estimate.lower.y_center}`} />
                    <path className="band-connection" d={`M ${ladder.x_right + 21} ${primary.band.y_center} Q ${(ladder.x_right + selected.x_left) / 2} ${primary.band.y_center - 2} ${selected.x_left - 4} ${primary.band.y_center}`} />
                    <rect className="estimated-band" x={selected.x_left + 4} y={primary.band.y_center - primary.band.band_height / 2 - 3} width={selected.x_right - selected.x_left - 8} height={primary.band.band_height + 6} rx="3" />
                    <text className="estimate-image-label" x={selected.x_left} y={primary.band.y_center - 14}>{primary.estimate.roundedBp} bp</text>
                    {targetReference && (
                      <g className="target-marker">
                        <path d={`M ${selected.x_right + 5} ${targetReference.y_center - 6} v 12 M ${selected.x_right + 5} ${targetReference.y_center} h 14`} />
                        <text x={selected.x_right + 23} y={targetReference.y_center + 3}>{run.target_bp} bp target</text>
                      </g>
                    )}
                  </svg>
                )}
                {evidenceLane && evidenceBand && (
                  <svg className="evidence-overlay" viewBox={`0 0 ${run.image_width} ${run.image_height}`} role="img" aria-label={`Active evidence outline: ${evidenceLane.label}, y = ${evidenceBand.y_center} px`}>
                    <rect x={evidenceLane.x_left + 3} y={evidenceBand.y_center - evidenceBand.band_height / 2 - 3} width={evidenceLane.x_right - evidenceLane.x_left - 6} height={evidenceBand.band_height + 6} rx="2" />
                  </svg>
                )}
                {negativeLane && controlFlags.length > 0 && (
                  <svg className="control-overlay" viewBox={`0 0 ${run.image_width} ${run.image_height}`} role="img" aria-label="Seeded review flag: faint band in the negative-control lane">
                    {controlFlags.map((band) => (
                      <g key={band.id}>
                        <rect className="negative-band-outline" x={negativeLane.x_left + 3} y={band.y_center - band.band_height / 2 - 5} width={negativeLane.x_right - negativeLane.x_left - 6} height={band.band_height + 10} rx="3" />
                        <path d={`M ${negativeLane.x_left + 9} ${band.y_center + band.band_height / 2 + 5} v 15 h 8`} />
                        <text x={negativeLane.x_left + 22} y={band.y_center + band.band_height / 2 + 24}>review control</text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            </div>
            <LaneTrace lane={selected} imagePath={run.image_path} width={run.image_width} height={run.image_height} />
            <figcaption>Demo image · synthetic teaching fixture, not an experimental result. Ruler marks follow the saved ladder bands.</figcaption>
          </figure>
          {negativeLane && controlFlags.length > 0 && (
            <section className="control-review" aria-labelledby="control-review-title">
              <span className="review-symbol" aria-hidden="true">!</span>
              <div>
                <p className="eyebrow">Negative control / lane {negativeLane.lane_number}</p>
                <h3 id="control-review-title">Review control before interpreting samples</h3>
                <p>A faint band is marked in the negative control. This is a seeded review flag, not automatic detection or confirmed contamination.</p>
                {controlFlags.map((band) => <button key={band.id} type="button" className="text-button" onClick={() => openEvidence(band.id)}>View negative-control evidence</button>)}
              </div>
            </section>
          )}
          {evidenceLane && evidenceBand && (
            <section id="image-evidence" className="image-evidence" tabIndex={-1} aria-labelledby="evidence-title">
              <div className="evidence-heading">
                <p className="eyebrow">Linked image evidence</p>
                <button type="button" className="text-button" onClick={() => setActiveBandId(null)}>Close evidence</button>
              </div>
              <h3 id="evidence-title">{evidenceBand.reference_bp !== null ? `${evidenceBand.reference_bp} bp ladder reference` : `${evidenceLane.label} band`}</h3>
              <EvidenceCrop run={run} lane={evidenceLane} band={evidenceBand} />
              <p className="evidence-observation">{evidenceBand.evidence_label}</p>
            </section>
          )}
        </section>

        <aside className="notebook-panel measurement-panel" aria-labelledby="measurement-title">
          <p className="eyebrow">At the bench</p>
          <h2 id="measurement-title">Lane measurements</h2>
          <div className="selection-details" aria-live="polite" aria-atomic="true">
            {selected ? (
              <>
                <p className="selected-lane-title">{selected.label}</p>
                <p className="eyebrow">Lane {selected.lane_number} / {selected.role}</p>
                {primary && (
                  <>
                    <dl className="size-comparison">
                      <div className="estimated-size"><dt>Estimated size:</dt><dd>{primary.estimate ? <button type="button" className="measurement-evidence-button" aria-label={`View ${selected.label} band evidence`} onClick={() => openEvidence(primary.band.id)}><strong>{primary.estimate.roundedBp}</strong> bp</button> : "Unavailable"}</dd></div>
                      <div><dt>Target:</dt><dd>{targetReference ? <button type="button" className="measurement-evidence-button" aria-label={`View ${run.target_bp} bp target reference evidence`} onClick={() => openEvidence(targetReference.id)}><strong>{run.target_bp}</strong> bp</button> : <><strong>{run.target_bp}</strong> bp</>}</dd></div>
                    </dl>
                    {primary.estimate ? (
                      <div className="reference-links" aria-label="Linked ladder references">
                        <p>Between ladder references</p>
                        {[primary.estimate.upper, primary.estimate.lower].map((reference) => (
                          <a key={reference.id} href={`#ladder-ref-${reference.id}`} onClick={(event) => { event.preventDefault(); openEvidence(reference.id); }}>{reference.reference_bp} bp <span>at y = {reference.y_center} px</span></a>
                        ))}
                      </div>
                    ) : <p className="measurement-footnote">No valid surrounding ladder pair. This demo does not extrapolate.</p>}
                  </>
                )}
                <dl className="measurement-list">
                  <div><dt>Target</dt><dd>{run.target_bp} bp</dd></div>
                  <div><dt>Saved bands</dt><dd>{selected.bands.length}</dd></div>
                  <div><dt>Lane region</dt><dd>{selected.x_left}–{selected.x_right} px</dd></div>
                </dl>
                <ul className="band-positions">
                  {selected.bands.map((band) => (
                    <li key={band.id}>
                      <button type="button" className="band-evidence-button" onClick={() => openEvidence(band.id)}>
                        <span>{band.reference_bp !== null ? `${band.reference_bp} bp reference` : "Band position"}</span>
                        <strong>y = {band.y_center} px</strong>
                        <span className="evidence-hint">View image evidence ↗</span>
                      </button>
                      {selected.role !== "ladder" && selected.bands.length > 1 && <span>Estimated size: {measurements.find((item) => item.band.id === band.id)?.estimate?.roundedBp ?? "unavailable"} bp</span>}
                    </li>
                  ))}
                </ul>
                <p className="measurement-footnote">{selected.role === "ladder" ? "Known ladder sizes at saved image coordinates." : "Estimated from saved band positions using logarithmic interpolation between ladder sizes. Rounded to the nearest bp; not a confirmed identity."}</p>
              </>
            ) : (
              <div className="measurement-empty">
                <span className="empty-lane-number">04</span>
                <h3>Follow sample a</h3>
                <p>Click lane 4 in the image to inspect its saved band position.</p>
                <p className="target-label">Target: {run.target_bp} bp</p>
              </div>
            )}
          </div>
          <p className="bench-note">A band is a starting point.<br />Read it alongside the controls.</p>
          <Link className="primary-action note-link" href={`/runs/${run.id}/note`}>Open lab-note draft <span aria-hidden="true">↗</span></Link>
        </aside>
      </div>}
    </>
  );
}
