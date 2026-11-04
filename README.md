# Sequence — Prompt Studio

A superadmin-only prompt chain editor built with Next.js and Supabase. Create, edit, delete and reorder up to 12 steps; run vision, text and image steps sequentially; inspect stored outputs by chain; choose light, dark or system appearance.

## Setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`. Set Supabase URL and anon key, Gemini API key, a vision/text-capable `GEMINI_MODEL`, and an image-generation-capable `GEMINI_IMAGE_MODEL`.
3. Run `supabase/schema.sql` in the Supabase SQL editor for the project containing your `profiles` table. It adds isolated `studio_chains` and `studio_runs` tables, RLS and role protection. Review existing security-definer functions in your database to ensure none let users change `profiles.is_superadmin`.
4. Grant your account superadmin using the SQL editor: `update public.profiles set is_superadmin=true where id='YOUR-USER-UUID';`.
5. Enable Google OAuth in Supabase and allow `http://localhost:3000/auth/callback` and the production callback URL in Authentication URL Configuration.
6. Run `npm run dev`.

All application data reads, writes and generation require an authenticated profile with `is_superadmin === true`. Database RLS independently enforces this restriction. No service role key is required. Steps are saved as an ordered JSON array in one atomic write; run snapshots preserve the executed sequence. `{{input}}`, `{{previous}}`, and `{{step1}}` reference input and preceding text outputs. Image-to-text steps use the uploaded source image. Image steps produce downloadable images when supported by the configured model. Generated images are stored privately with run data; history shows the latest 50 workspace runs. Source uploads are sent to the model and not retained.

## Deploy to Vercel

Create a private GitHub repository, push this directory and import it as a new Vercel project. Add the environment variables above, deploy, and add the resulting callback URL to Supabase. In Vercel project Settings → Deployment Protection, disable Vercel Authentication and save. The application still enforces its own login and superadmin authorization. Check the deployed page in Incognito: it should display the login screen without a Vercel gate.

Generation requests have a 300-second function budget and 60-second limit per model request; long chains can exceed hosting limits. Interrupted requests can leave a run marked running. Failed model calls retain completed step outputs. A future durable job queue is recommended for long chains and production workloads. Chain saves use last-write-wins; coordinate simultaneous editing.

## Per-step model settings

Each step has a Gemini model selector and optional temperature. Models are loaded server-side from Gemini's Models API using the existing `GEMINI_API_KEY`; the key is never sent to the browser. Image-output steps show image models; text and vision steps show text-output models. Provider model availability does not guarantee quota or billing access.

Choose **Workspace default** to retain `GEMINI_MODEL` / `GEMINI_IMAGE_MODEL`. Leaving temperature blank uses the model's default. Numeric temperatures are checked against model metadata; fixed-sampling models omit this parameter. Google recommends default temperature for Gemini 3. Selected settings persist with the chain, and each run snapshots its resolved model and generation configuration. Existing chains continue using workspace defaults. No schema migration is required.

Run settings regression tests with `node --test tests/*.test.mjs`.
