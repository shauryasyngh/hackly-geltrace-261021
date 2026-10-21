import "server-only";
import demo from "@/lib/demo-run.json";
import { supabaseServer } from "@/lib/supabase/server";

export type GelBand = {
  id: string;
  lane_id: string;
  y_center: number;
  band_height: number;
  reference_bp: number | null;
  evidence_label: string;
};

export type GelLane = {
  id: string;
  run_id: string;
  lane_number: number;
  label: string;
  role: string;
  x_left: number;
  x_right: number;
  bands: GelBand[];
};

export type GelRun = {
  id: string;
  title: string;
  image_path: string;
  image_width: number;
  image_height: number;
  target_bp: number;
  is_demo: boolean;
  lanes: GelLane[];
};

export const DEMO_RUN_ID = demo.id;

export async function loadDemoRun(): Promise<{ run: GelRun; source: "saved" | "bundled" }> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await supabaseServer();
      const { data, error } = await supabase
        .from("gel_runs")
        .select("*, lanes:gel_lanes(*, bands:gel_bands(*))")
        .eq("id", DEMO_RUN_ID)
        .eq("is_demo", true)
        .abortSignal(AbortSignal.timeout(4000))
        .single();
      if (!error && data && data.lanes?.length === 5 && data.lanes.every((lane: GelLane) => lane.bands?.length > 0)) {
        const run = data as GelRun;
        run.lanes.sort((a, b) => a.lane_number - b.lane_number);
        for (const lane of run.lanes) lane.bands.sort((a, b) => a.y_center - b.y_center);
        return { run, source: "saved" };
      }
    } catch {
      // The public synthetic fixture remains usable without a live database.
    }
  }
  return { run: demo, source: "bundled" };
}
