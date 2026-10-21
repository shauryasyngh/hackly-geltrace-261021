import type { GelBand } from "./gel-run";

export type LadderReference = GelBand & { reference_bp: number };

export type BandEstimate = {
  sizeBp: number;
  roundedBp: number;
  upper: LadderReference;
  lower: LadderReference;
};

// Migration distance is interpolated against log(bp), not directly against bp.
// Never extrapolate beyond the ladder or use an ambiguous calibration.
export function estimateBandSize(y: number, bands: GelBand[]): BandEstimate | null {
  const references = bands
    .filter((band): band is LadderReference =>
      band.reference_bp !== null && Number.isFinite(band.reference_bp) &&
      band.reference_bp > 0 && Number.isFinite(band.y_center))
    .sort((a, b) => a.y_center - b.y_center);

  if (!Number.isFinite(y) || references.length < 2) return null;
  for (let index = 1; index < references.length; index++) {
    if (references[index].y_center <= references[index - 1].y_center ||
        references[index].reference_bp >= references[index - 1].reference_bp) return null;
  }

  for (let index = 1; index < references.length; index++) {
    const upper = references[index - 1];
    const lower = references[index];
    if (y < upper.y_center || y > lower.y_center) continue;
    const fraction = (y - upper.y_center) / (lower.y_center - upper.y_center);
    const sizeBp = Math.exp(Math.log(upper.reference_bp) +
      fraction * (Math.log(lower.reference_bp) - Math.log(upper.reference_bp)));
    return { sizeBp, roundedBp: Math.round(sizeBp), upper, lower };
  }
  return null;
}
