import type { GelBand, GelLane, GelRun } from "@/lib/gel-run";

export default function EvidenceCrop({ run, lane, band }: { run: GelRun; lane: GelLane; band: GelBand }) {
  const x = Math.max(0, lane.x_left - 12);
  const y = Math.max(0, band.y_center - 26);
  const width = Math.min(run.image_width - x, lane.x_right - lane.x_left + 24);
  const height = Math.min(run.image_height - y, 52);

  return (
    <figure className="evidence-crop" data-band-id={band.id}>
      <svg viewBox={`${x} ${y} ${width} ${height}`} role="img" aria-label={`Evidence crop: ${lane.label}, band at y = ${band.y_center} px`}>
        <image href={run.image_path} x="0" y="0" width={run.image_width} height={run.image_height} />
        <rect x={lane.x_left + 3} y={band.y_center - band.band_height / 2 - 3} width={lane.x_right - lane.x_left - 6} height={band.band_height + 6} rx="2" />
      </svg>
      <figcaption>Crop of the synthetic demo image · lane {lane.lane_number}, {lane.label}<br />Band centre: y = {band.y_center} px · lane: x = {lane.x_left}–{lane.x_right} px</figcaption>
    </figure>
  );
}
