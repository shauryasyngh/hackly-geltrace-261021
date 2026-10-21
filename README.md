# geltrace

geltrace helps biotech students compare gel bands with ladder references and controls. This hackathon demo has two product pages and one clearly labelled synthetic gel, **gel run 07**. No login or upload is needed to try it.

## Run it

Use Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The starter expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the environment. For the saved database run, set these to your Supabase project URL and public anonymous key. For a local demo without a database, start with harmless placeholders:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder npm run dev
```

You may configure your own local environment file using the variable names in `.env.example`. Keep real secrets out of source control. A service-role key is not needed.

For a production build:

```sh
npm run build
npm start
```

Supply the same environment variables when building and starting. Internet access loads Instrument Serif and Instrument Sans from Google Fonts; the page has serif and sans-serif fallbacks.

## Set up the saved run

hackly applies the migrations to the team's Supabase project. If doing this yourself, use the Supabase SQL editor to run these files in order:

1. `supabase/migrations/0001_init.sql` — the unchanged starter profiles and auth setup; run once if it is not already applied.
2. `supabase/migrations/0002_gel_runs.sql` — the gel runs, lanes and bands, with row level security.
3. `supabase/seed.sql` — gel run 07, five lanes and ten bands. The seed can be rerun; existing rows are left alone.

The synthetic demo is readable by signed-out visitors. The app has no write policies or measurement-editing controls. Its existing auth helpers and routes remain from the starter; signing in is not part of this demo.

The app first tries the saved run through the starter's Supabase client. If the database is unavailable or the run has not been seeded, it opens the matching bundled copy from `lib/demo-run.json` and labels it **Bundled demo copy**. Both pages disclose their source. A successful fallback is not proof that the database has been set up. The migrations have been prepared here; applying them to the team's live database is a separate setup step.

## What the pages do

- `/` opens all five labelled lanes: ladder, positive, negative, sample a and sample b. Click a lane to inspect its band position, calculated size and brightness trace. The green ruler follows the ladder coordinates. Clicking an estimate, reference, target or control evidence action opens its matching image crop and outline. The negative-control review flag stays visible while inspecting a sample.
- `/runs/00000000-0000-4000-8000-000000000007/note` opens the ruled notebook draft. Its observations use the same saved positions and calculation as the gel page. Click an observation to see its crop and full-gel outline. **Copy lab note** copies the observations, calibration, evidence coordinates, conclusion and limitations. If the browser blocks the clipboard, the full text is selected for manual copying. Other run IDs return a missing-page response.

The notebook is a rule-based draft for human review. Copying does not create a new database entry.

## Demo in 90 seconds

1. **0–15 seconds:** Open `/`. Point out the synthetic image label, five lanes, ruler and data-source label.
2. **15–35 seconds:** Click **lane 4 / sample a**. Show **estimated size: 510 bp** beside **target: 500 bp**, and the bracket to the **600 bp** and **500 bp** ladder references. Open a reference to inspect its crop.
3. **35–55 seconds:** Point to the intensity trace below the gel. Click **View negative-control evidence**. Show the faint band at y = 178 px and the warning **review control before interpreting samples**. Explain that this is a seeded review flag.
4. **55–80 seconds:** Click **Open lab-note draft**. Show the matching measurements, click the negative-control sentence, and read the conclusion: **repeat control before interpretation**. Click **Copy lab note** and paste into a text editor.
5. **80–90 seconds:** Return to the gel and preview an image. Point out that it is unmeasured and the seeded overlays disappear. Return to the demo run.

## What is calculated, and what is limited

The ladder stores 1000 bp at y = 70, 700 bp at 115, 600 bp at 140, 500 bp at 180, 400 bp at 225 and 300 bp at 280. Sample a is at y = 175.655. Its size comes from interpolation in log(bp):

```text
fraction = (sample_y - upper_y) / (lower_y - upper_y)
size_bp = exp(log(upper_bp) + fraction * (log(lower_bp) - log(upper_bp)))
```

This rounds to 510 bp. Exact ladder positions return their reference sizes. Missing, ambiguous or out-of-range calibration does not produce an extrapolated estimate. Rounding to a whole bp does not imply that level of experimental precision.

The trace averages actual pixel luminance across the selected lane interior, rows 56–309, on a fixed 0–255 scale. It excludes image labels and wells, and uses no background subtraction, automatic band detection or contamination classifier. The dashed trace marks use the saved band positions.

The control band is deliberately drawn faintly in the synthetic image. Its warning is a seeded observation, not a finding made by AI or an automatic detector. Band identity and contamination are not confirmed. Repeat the control before interpreting samples.

Uploaded images are **local previews only**. They are not sent to a server, saved, calibrated or measured. Demo measurements, traces, evidence and notebook actions are removed in preview mode. Browser object URLs are released when a preview is replaced or closed.

There are no AI service calls, diagnostic claims, experimental-gel validation, upload analysis, additional runs or editing workflows. These are outside this demo's scope.

## Checks

```sh
npm run smoke
```

This builds the production app, starts a temporary server, checks that `/` returns HTTP 200 and stops the server. It supplies placeholder environment values when none are set. To include the full interactive demo check, give it a Chrome or Chromium executable:

```sh
CHROME_BIN=/absolute/path/to/chromium npm run smoke
```

The browser check uses Node's built-in WebSocket and Chrome's debugging protocol; it adds no npm dependencies. It checks lane 4, the 600/500 bp references, image trace, negative-control crop, notebook navigation, real clipboard contents, manual-copy fallback, mobile width and upload-preview isolation. Without `CHROME_BIN`, the command explicitly reports that browser checks were skipped. Use the full command for demo rehearsal. Chromium on Linux also needs its normal system libraries.

The build has also been checked with browser interactions for all ten evidence crops, repeated uploads and invalid-image recovery. Live database connectivity and policy execution require the team's configured Supabase project.

## Synthetic image and seed consistency

`public/images/gel-run-07.png` is the bundled 640 × 360 synthetic image. `scripts/generate-demo-gel.py` reads the positions directly from `supabase/seed.sql`, draws all ten bands at those coordinates with fixed noise seed 7, and regenerates `lib/demo-run.json`. The app needs neither Python nor Pillow at runtime.

If the fixture needs to be regenerated, use a Python environment with Pillow installed:

```sh
python scripts/generate-demo-gel.py
```

Keep the SQL seed, bundled JSON and PNG together. Existing database rows are not updated by rerunning the idempotent seed.

## Delivery

The handoff is `/workspace/outputs/app.tgz`, containing this source, README, migrations, seed and synthetic image. Installed dependencies, build output and git history are excluded. Extract it into a new directory and follow the run instructions above. No deployment or database changes are performed by extracting the archive.
