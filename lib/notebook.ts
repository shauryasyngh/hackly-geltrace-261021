import { estimateBandSize } from "./calibration";
import type { GelBand, GelLane, GelRun } from "./gel-run";

export type NoteEvidence = { lane: GelLane; band: GelBand; label: string };

export function buildNotebook(run: GelRun, source: "saved" | "bundled") {
  const sampleLane = run.lanes.find((lane) => lane.role === "sample" && lane.lane_number === 4);
  const sampleBand = sampleLane?.bands[0];
  const ladder = run.lanes.find((lane) => lane.role === "ladder");
  const targetBand = ladder?.bands.find((band) => band.reference_bp === run.target_bp);
  const controlLane = run.lanes.find((lane) => lane.role === "negative");
  const controlBand = controlLane?.bands.find((band) => band.evidence_label.includes("seeded review flag"));
  const estimate = sampleBand && ladder ? estimateBandSize(sampleBand.y_center, ladder.bands) : null;
  if (!run.is_demo || !sampleLane || !sampleBand || !ladder || !targetBand || !controlLane || !controlBand || !estimate) return null;

  const sample: NoteEvidence = { lane: sampleLane, band: sampleBand, label: `${sampleLane.label} band` };
  const control: NoteEvidence = { lane: controlLane, band: controlBand, label: "Negative-control review flag" };
  const target: NoteEvidence = { lane: ladder, band: targetBand, label: `${targetBand.reference_bp} bp ladder reference` };
  const upper: NoteEvidence = { lane: ladder, band: estimate.upper, label: `${estimate.upper.reference_bp} bp ladder reference` };
  const lower: NoteEvidence = { lane: ladder, band: estimate.lower, label: `${estimate.lower.reference_bp} bp ladder reference` };
  const conclusion = "repeat control before interpretation";
  const sourceLabel = source === "saved" ? "Saved demo run" : "Bundled demo copy (saved run unavailable)";
  const limitations = [
    "Sizes use saved band positions and logarithmic interpolation between ladder references. Values are rounded to the nearest bp; this does not establish measurement precision or confirm band identity.",
    "The negative-control observation is a seeded review flag in a synthetic image. It is not automatic detection or confirmed contamination. Repeat the control before interpreting samples.",
    "The brightness trace reads synthetic image pixels without background subtraction or a detection threshold. Calibration and control interpretation have not been validated on experimental gels.",
    "New images are previewed locally and are not measured. This rule-based draft describes only the seeded demo run and needs human review.",
  ];
  const describeEvidence = (evidence: NoteEvidence) =>
    `${run.image_path}; lane ${evidence.lane.lane_number} (${evidence.lane.label}); x = ${evidence.lane.x_left}–${evidence.lane.x_right} px; band centre y = ${evidence.band.y_center} px`;
  const text = [
    run.title,
    "Rule-based lab-note draft — synthetic demo image; for human review.",
    `Source: ${sourceLabel}`,
    "",
    `${sampleLane.label}: estimated ${estimate.roundedBp} bp`,
    `target: ${run.target_bp} bp`,
    "negative control: faint band detected (seeded review flag)",
    "",
    `Calibration: logarithmic interpolation between ${estimate.upper.reference_bp} bp at y = ${estimate.upper.y_center} px and ${estimate.lower.reference_bp} bp at y = ${estimate.lower.y_center} px.`,
    `Sample evidence: ${describeEvidence(sample)}`,
    `Control evidence: ${describeEvidence(control)}`,
    `Target evidence: ${describeEvidence(target)}`,
    "",
    `Conclusion: ${conclusion}`,
    "",
    "Limitations:",
    ...limitations.map((limitation) => `- ${limitation}`),
  ].join("\n");

  return { sample, control, target, upper, lower, estimate, conclusion, sourceLabel, limitations, text };
}

export type Notebook = NonNullable<ReturnType<typeof buildNotebook>>;
