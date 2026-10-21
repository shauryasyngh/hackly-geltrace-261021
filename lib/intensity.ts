// Average actual image pixels on a fixed 0–255 luminance scale. No thresholding,
// band detection, background subtraction, or per-lane normalization is applied.
export function laneIntensity(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  xLeft: number,
  xRight: number,
  yStart: number,
  yEnd: number,
): { y: number; brightness: number }[] {
  if (pixels.length !== width * height * 4 || width <= 0 || height <= 0) {
    throw new Error("Image pixels do not match the image dimensions.");
  }
  const left = Math.max(0, Math.ceil(xLeft));
  const right = Math.min(width, Math.floor(xRight));
  const start = Math.max(0, Math.ceil(yStart));
  const end = Math.min(height, Math.floor(yEnd));
  if (![left, right, start, end].every(Number.isFinite) || right <= left || end <= start) {
    throw new Error("The selected lane is outside the image.");
  }
  const trace = [];
  for (let y = start; y < end; y++) {
    let total = 0;
    for (let x = left; x < right; x++) {
      const offset = (y * width + x) * 4;
      total += pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722;
    }
    trace.push({ y: y + 0.5, brightness: total / (right - left) });
  }
  return trace;
}
