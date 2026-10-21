"""Regenerate the synthetic demo PNG from seed.sql coordinates; requires Pillow.

Run from any directory with: python scripts/generate-demo-gel.py
The app uses the bundled PNG and needs no Python or Pillow at runtime.
"""

import ast
import json
import math
from pathlib import Path
import random
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / "supabase/seed.sql").read_text()


def rows(table):
    match = re.search(
        rf"insert into public\.{table}\s*\([^;]+?\)\s*values\s*(.*?)\s*on conflict do nothing;",
        SQL,
        re.S,
    )
    if not match:
        raise ValueError(f"Missing seed table: {table}")
    values = re.sub(r"\bnull\b", "None", match[1])
    values = re.sub(r"\btrue\b", "True", values)
    return ast.literal_eval("[" + values + "]")


run, = rows("gel_runs")
lanes = rows("gel_lanes")
bands = rows("gel_bands")
_, _, image_path, width, height, _, _ = run
assert (width, height) == (640, 360)
lane_by_id = {lane[0]: lane for lane in lanes}
assert len(lanes) == 5 and len(bands) == 10

rng = random.Random(7)
image = Image.new("RGB", (width, height))
pixels = image.load()
for y in range(height):
    for x in range(width):
        background = 19 + rng.uniform(-3, 3)
        brightness = background
        for _, lane_id, center, band_height, _, _ in bands:
            lane = lane_by_id[lane_id]
            left, right = lane[5] + 8, lane[6] - 8
            if left <= x + 0.5 <= right:
                # Continuous Gaussian centered at the exact stored y coordinate.
                sigma = band_height / 2.355
                vertical = math.exp(-0.5 * ((y + 0.5 - center) / sigma) ** 2)
                edge = min(1, (x + 0.5 - left) / 4, (right - x - 0.5) / 4)
                strength = 32 if lane[4] == "negative" else 185
                brightness += strength * vertical * edge
        value = max(0, min(255, round(brightness)))
        pixels[x, y] = (value, value, min(255, value + 5))

draw = ImageDraw.Draw(image)
font = ImageFont.load_default()
draw.text((16, 9), "SYNTHETIC DEMO IMAGE  /  GEL RUN 07", font=font, fill=(225, 220, 225))
for lane in lanes:
    midpoint = (lane[5] + lane[6]) / 2
    label = f"{lane[2]}  {lane[3]}"
    draw.text((midpoint, 32), label, anchor="mt", font=font, fill=(210, 205, 210))
    draw.rounded_rectangle((lane[5] + 8, 48, lane[6] - 8, 53), radius=2, fill=(42, 42, 47))
draw.text((16, 337), "Synthetic teaching fixture; not an experimental result.", font=font, fill=(180, 175, 180))

output = ROOT / "public" / image_path.lstrip("/")
output.parent.mkdir(parents=True, exist_ok=True)
image.save(output, optimize=True)
print(f"Generated {output.relative_to(ROOT)} ({width} x {height}); 5 lanes, 10 bands, noise seed 7.")

# Exact bundled copy for a usable, clearly labelled demo when Supabase is offline.
run_fields = ("id", "title", "image_path", "image_width", "image_height", "target_bp", "is_demo")
lane_fields = ("id", "run_id", "lane_number", "label", "role", "x_left", "x_right")
band_fields = ("id", "lane_id", "y_center", "band_height", "reference_bp", "evidence_label")
fixture = dict(zip(run_fields, run))
fixture["lanes"] = []
for lane in lanes:
    item = dict(zip(lane_fields, lane))
    item["bands"] = [dict(zip(band_fields, band)) for band in bands if band[1] == lane[0]]
    fixture["lanes"].append(item)
(ROOT / "lib/demo-run.json").write_text(json.dumps(fixture, indent=2) + "\n")
