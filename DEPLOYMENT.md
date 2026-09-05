# Deploying HireMind Unified Portal

This project operates as a unified single-origin portal running two core services:

| Service | Local address | Purpose |
| --- | --- | --- |
| **Resume AI Backend Engine** | `http://localhost:5000` | Flask API and 8-agent processing pipeline |
| **HireMind Unified Portal** | `http://localhost:3000` | Consolidated Recruiter, Candidate & AI Resume Parser Portal |

Docker Compose starts both services and retains pipeline/profile data in Docker volumes.

## First-Time Setup

1. Install Docker Desktop and make sure it is running.
2. Copy `.env.example` to `.env` and fill in the server-side API keys and Supabase public configuration.
3. From the project root, run:

   ```powershell
   docker compose up --build -d
   ```

4. Open the unified portal at `http://localhost:3000`.

Check that the API is available with `http://localhost:5000/health`. To view logs, use `docker compose logs -f`; to stop the deployment, use `docker compose down`.

## Deploying to a Server

Before the first build, set these values in the server's `.env` to your public HTTPS URLs:

```env
NEXT_PUBLIC_RESUME_PARSER_URL=https://api.example.com
CORS_ORIGINS=https://portal.example.com,https://resume.example.com
VITE_API_URL=https://api.example.com
```

Point the public hostnames at ports 5000 and 3000 through your hosting provider or reverse proxy.

