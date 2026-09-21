# Resume Parser — Zero-Cost Cloud Deployment Guide

> **Deployment Architecture (all free tier, no card required):**
>
> | Service | Provider | Plan | URL (after deploy)
> |---|---|---|---|
> | Flask API + 6-agent pipeline | [Render](https://dashboard.render.com) | Free (Starter 512 MB, 750 h/mo) | `https://resume-parser-api-<xxx>.onrender.com`
> | Vite Resume Upload & Parse UI | [Netlify](https://app.netlify.com) | Free (100 GB/mo bandwidth) | `https://resume-parser-<xxx>.netlify.app`
> | Storage | [Supabase](https://supabase.com/dashboard) | Free (1 GB Storage) | Project Ref: `<project-ref>`
> | Source of truth / CI/CD | GitHub | Public | `https://github.com/udaykumar5683/HireMind`

---

## 0. Pre-Deployment Checklist

Before touching cloud dashboards:

1. Confirm you have working values for every env var NAME below. Values never go in this file.

### Environment Variable Inventory (NAMES ONLY, values in provider dashboards)

| Env Var Name | Set In | Purpose
|---|---|---|
| `VITE_GROQ_API_KEY` | Render (secret) | Groq LLM — server-side parse-resume proxy + Agents 4/5/6
| `GROQ_API_KEY` | Render (secret) | Same value as `VITE_GROQ_API_KEY` — server fallback
| `VITE_GITHUB_TOKEN` | Render (secret) | GitHub API proxy auth
| `GITHUB_TOKEN` | Render (secret) | Same value as `VITE_GITHUB_TOKEN` — server fallback
| `PROXYCURL_KEY` | Render (secret, optional) | LinkedIn enrichment fallback
| `SUPABASE_URL` | Render (secret) | Storage backend server-side bucket writes
| `SUPABASE_SERVICE_KEY` | Render (secret only, NEVER in frontends) | Bucket creation + private bucket list/write
| `CORS_ORIGINS` | Render env (comma-separated list) | Known browser origins; NEVER wildcard `*`
| `VITE_API_URL` | Netlify build-time | Render public URL — for Resume UI backend calls

### 1. Render (Flask Backend)

**Deploy type: Docker (via `deploy/api.Dockerfile`)**

1. Dashboard → "New +" → "Web Service" → import the GitHub repo.
2. Choose "Connect" if Blueprint import option shown; otherwise:
   - **Name**: resume-parser-api
   - **Language**: Docker
   - **Root Directory**: `/`
   - **Dockerfile Path**: `deploy/api.Dockerfile`
   - **Region**: Oregon (or Frankfurt)
   - **Instance Type**: **Free** / Starter (0.1 vCPU / 512 MB) — never choose paid.
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Yes (main branch)
3. Paste ALL of the "Env Vars" tab: every name from inventory above (values only entered here).
   Initial value for `CORS_ORIGINS`: `http://localhost:5173`. After Netlify deploy completes, append the Netlify domain and hit "Manual Deploy" → "Clear build cache & deploy".
4. Click "Deploy". Wait for status: **Live**.
5. Verify public endpoint. Smoke test:
   ```sh
   curl https://<render-url>.onrender.com/health
   # expect: {"status":"ok"}
   ```
6. Record Render URL → you'll use it in Step 2.

### 2. Netlify (Resume UI)

1. Netlify Dashboard → "Add new site" → "Import an existing project" → GitHub.
2. Select repo.
3. Site settings:
   - **Base directory**: `Resume Parser/Resume Parser`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. "Site configuration" → "Environment variables" → Add:
   - Key `VITE_API_URL` → value = Render URL from Step 1.
5. "Deploys" → "Trigger deploy" → "Deploy site".
6. After deploy success, browse to the assigned `https://<site-name>.netlify.app` and also test `https://<site-name>.netlify.app/does-not-exist-1234` — both should return 200 (SPA fallback handled by netlify.toml redirect rule).
7. Record Netlify URL → return to Step 1 and add it to the `CORS_ORIGINS` list on Render + re-deploy Render.

### 3. Final CORS & URL Lock-in

1. Render env `CORS_ORIGINS` final format:

   ```
   http://localhost:5173,https://resume-parser-xxx.netlify.app
   ```
2. Save + re-deploy Render. Confirm `/health` 200.

### 4. Supabase Storage Prep

1. Storage → Create new bucket (if not already auto-created by storage_backend.ensure_buckets_exist):
   - Name: `hiremind-data`; make private (not public).
2. Manually create folders: `agent1_output` … `agent6_output`, `student_profiles`, `generated_profiles`.
3. Storage → Policies → Add policy (template: allow `service_role` full access, `anon` read-signed-only).

### 5. Production E2E Run

1. Netlify Resume UI → fill sample resume PDF → Parse → Save Profile → Run Pipeline → wait.
2. Polling `/pipeline-status` → `completed`.
3. Supabase Storage → confirm files present.
4. Done.
