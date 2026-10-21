"use client";

import { useEffect, useState } from "react";
import type { GelLane } from "@/lib/gel-run";
import { laneIntensity } from "@/lib/intensity";

type TraceState = {
  laneId: string;
  imagePath: string;
  points?: { y: number; brightness: number }[];
  error?: string;
};

export default function LaneTrace({ lane, imagePath, width, height }: {
  lane: GelLane | undefined;
  imagePath: string;
  width: number;
  height: number;
}) {
  const [trace, setTrace] = useState<TraceState | null>(null);
  const laneId = lane?.id;
  const xLeft = lane?.x_left;
  const xRight = lane?.x_right;
  // Leave the image's labels, wells and footer out of the gel scan.
  const start = 56;
  const end = Math.min(310, height);

  useEffect(() => {
    if (!laneId || xLeft === undefined || xRight === undefined) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      try {
        if (image.naturalWidth !== width || image.naturalHeight !== height) throw new Error("Image dimensions differ from this run.");
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Image pixels are unavailable in this browser.");
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        const points = laneIntensity(pixels, width, height, xLeft + 8, xRight - 8, start, end);
        if (!cancelled) setTrace({ laneId, imagePath, points });
      } catch {
        if (!cancelled) setTrace({ laneId, imagePath, error: "Could not read image pixels. The intensity trace is unavailable." });
      }
    };
    image.onerror = () => {
      if (!cancelled) setTrace({ laneId, imagePath, error: "Could not load the demo image for its intensity trace." });
    };
    image.src = imagePath;
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [laneId, xLeft, xRight, imagePath, width, height, end]);

  const current = trace && trace.laneId === laneId && trace.imagePath === imagePath ? trace : null;
  const plotX = (y: number) => 44 + (y - start) / (end - start) * 576;
  const plotY = (brightness: number) => 124 - brightness / 255 * 100;
  const points = current?.points;

  return (
    <section className="lane-trace" aria-labelledby="trace-title">
      <div className="trace-heading">
        <h3 id="trace-title">{lane ? `Lane ${lane.lane_number} · ${lane.label} intensity` : "Lane intensity"}</h3>
        <span>Image pixels / 0–255</span>
      </div>
      {!lane ? <p className="trace-status">Select a lane to read its brightness along the gel.</p> : current?.error ? (
        <p className="trace-status" role="status">{current.error}</p>
      ) : !points ? <p className="trace-status" role="status">Reading image pixels…</p> : (
        <>
          <svg className="intensity-chart" viewBox="0 0 640 162" role="img" aria-label={`Image brightness along ${lane.label}, pixel rows ${start} to ${end}; fixed scale 0 to 255`}>
            {[0, 128, 255].map((value) => (
              <g key={value} className="trace-grid">
                <line x1="44" x2="620" y1={plotY(value)} y2={plotY(value)} />
                <text x="34" y={plotY(value) + 3} textAnchor="end">{value}</text>
              </g>
            ))}
            {[60, 120, 180, 240, 300].filter((y) => y >= start && y <= end).map((y) => (
              <text key={y} x={plotX(y)} y="143" textAnchor="middle">{y}</text>
            ))}
            {lane.bands.filter((band) => band.y_center >= start && band.y_center < end).map((band) => (
              <line key={band.id} className="trace-band-position" x1={plotX(band.y_center)} x2={plotX(band.y_center)} y1="24" y2="124" />
            ))}
            <polyline className="intensity-line" points={points.map((point) => `${plotX(point.y).toFixed(3)},${plotY(point.brightness).toFixed(3)}`).join(" ")} />
            <text x="620" y="159" textAnchor="end">Distance down image (px)</text>
          </svg>
          <p className="trace-caption">Mean brightness across the lane interior, rows {start}–{end}. Same scale for every lane; no background subtraction. Dashed marks are saved band positions.</p>
        </>
      )}
    </section>
  );
}
