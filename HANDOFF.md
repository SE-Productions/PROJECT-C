# AURA Publishing Platform — Complete Handoff Document

**Generated:** 2026-07-06  
**Repository:** `SE-Productions/PROJECT-C` (branch: `main`)  
**Deploy URL:** https://project-c-64qo.onrender.com  
**Render Service:** `srv-d94s6vhkh4rs73fmllbg` (Free tier, Ohio)  
**Database:** Aiven PostgreSQL  
**Node Version:** >= 20.0.0  
**React Version:** 19.2.7 (exact pin)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [File Structure](#4-file-structure)
5. [Environment Variables](#5-environment-variables)
6. [API Key Status](#6-api-key-status)
7. [Security Implementation](#7-security-implementation)
8. [AI Integration Details](#8-ai-integration-details)
9. [Database Schema](#9-database-schema)
10. [API Endpoints](#10-api-endpoints)
11. [Pages & Routes](#11-pages--routes)
12. [Deploy History](#12-deploy-history)
13. [Known Issues](#13-known-issues)
14. [Quick Commands](#14-quick-commands)
15. [Login Credentials](#15-login-credentials)

---

## 1. Project Overview

AURA Publishing Platform is a full-stack AI-powered publishing management system with autonomous agents for marketing, media generation, social media publishing, and campaign orchestration. Built as a single-user commercial application.

### Agents
| Agent | Role |
|-------|------|
| **Planner** | Orchestrates marketing campaigns |
| **Research** | Web search and trend analysis |
| **Media** | Image and video generation via A2E AI |
| **Social** | Social media content creation and publishing |

---

## 2. System Architecture

```
Frontend (React 19 + TypeScript + Tailwind + shadcn/ui)
  |
  |-- HTTP/1.1 -->
  |
Backend (Hono + tRPC + esbuild)
  |
  |-- TCP/SSL -->
  |
Database (Aiven PostgreSQL + Drizzle ORM)
  |
  |-- HTTPS -->
  |
External APIs (Gemini, NVIDIA, A2E, Firecrawl, Steel, Composio)
```

### Build Pipeline
```
Frontend: Vite bundles React/TypeScript → dist/public/
Backend:  esbuild compiles api/ → dist/index.js
Both:     npm run build produces unified dist/
```

---

## 3. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19.2.7 |
| Frontend Build | Vite | ^6.x |
| Styling | Tailwind CSS | ^4.x |
| UI Components | shadcn/ui + Radix | latest |
| Icons | Lucide React | ^0.x |
| Backend Framework | Hono | ^4.x |
| API Protocol | tRPC | ^11.x |
| Serialization | superjson | ^2.x |
| State Management | TanStack Query | ^5.x |
| ORM | Drizzle ORM | ^0.x |
| Database | PostgreSQL (Aiven) | 15+ |
| DB Driver | pg (node-postgres) | ^8.x |
| Backend Bundler | esbuild | ^0.x |
| Validation | Zod | ^3.x |

---

## 4. File Structure

```
/
api/                          # Backend (Hono + tRPC)
  boot.ts                     # Server bootstrap, CORS, rate limiting, security headers
  router.ts                   # tRPC router registry (15 sub-routers)
  middleware.ts               # tRPC init, publicQuery, authedQuery
  context.ts                  # tRPC context factory
  lib/
    model-router.ts           # 5-model AI router (Gemini, Llama 70B/8B, Mixtral, Mistral)
    a2e.ts                    # A2E media generation client (5 image + 6 video models)
    gemini.ts                 # Gemini API client with circuit breaker
    db-utils.ts               # getInsertId safe utility
    schema-sync.ts            # Auto-create DB tables on boot
    env.ts                    # Environment variable definitions
  runtime/
    ai-execution.ts           # E = R[(G+C+K+T+M) -> O -> P -> A -> V -> d -> F] formula
    hardened-loop.ts          # Hardened execution loop
    agent-loop.ts             # Agent execution loop
    memory.ts                 # Scratch pad memory (write, search, get, delete)
    reflection.ts             # 4-dimension reflection scoring
    agents.ts                 # Agent definitions and types
    crew.ts                   # Multi-agent crew orchestration
    index.ts                  # Runtime router
  skills/
    registry.ts               # 30 skills across 6 categories
    loader.ts                 # Auto-load skills to DB on boot
  generate.ts                 # Image/video generation (A2E primary, NVIDIA fallback)
  media.ts                    # Media CRUD (list, create, update, delete)
  books.ts                    # Book catalog management
  campaigns.ts                # Marketing campaigns
  posts.ts                    # Social post scheduler
  agents.ts                   # Agent tasks and messages
  search.ts                   # Web search (Firecrawl/Steel)
  social.ts                   # Social media actions
  composio.ts                 # Composio integration (6 platforms)
  crew.ts                     # Crew management
  cron.ts                     # Cron job scheduling
  smart-chat.ts               # AI chat interface
  scratch-pad.ts              # Memory tabs + skill library
db/
  schema.ts                   # 9 table definitions (Drizzle pg-core)
  relations.ts                # (empty — FK constraints via app logic)
  connection.ts               # DB connection factory
  migrations/                 # Migration files
src/                          # Frontend (React + TypeScript)
  pages/                      # 11 page components
    Dashboard.tsx             # Stats, agent status, recent tasks
    Books.tsx                 # Book catalog
    Campaigns.tsx             # Marketing campaigns
    AgentHub.tsx              # Agent management
    MediaGallery.tsx          # AI media generation + gallery
    PostScheduler.tsx         # Social post calendar
    ScratchPad.tsx            # Memory + reflection tabs
    Skills.tsx                # 30 skills library
    Learn.tsx                 # Learning resources
    Settings.tsx              # API key health + auth config
    SmartChat.tsx             # AI chat
  components/
    Layout.tsx                # Sidebar navigation (responsive)
    PageHero.tsx              # Hero image banner
    ComposioDropdown.tsx      # Platform connection grid
    ui/                       # 40 shadcn/ui components
  providers/
    trpc.tsx                  # tRPC client + auth header from localStorage
  main.tsx                    # React entry, BrowserRouter, QueryClient
  index.css                   # Tailwind directives, CSS variables
public/
  images/
    hero-*.jpg                # 11 AI-generated hero banners
  favicon.ico                 # Branded favicon
  manifest.json               # PWA manifest
index.html                    # HTML entry with meta tags
drizzle.config.ts             # Drizzle ORM config
package.json                  # 45 deps, 18 devDeps
render.yaml                   # Render service blueprint
vite.config.ts                # Vite + path aliases
tsconfig.json                 # TypeScript config
tailwind.config.ts            # Dark mode, CSS variables
.env.example                  # All env var names (no values)

---

## 5. Environment Variables

All configured on Render at: https://dashboard.render.com/web/srv-d94s6vhkh4rs73fmllbg/env

### Core App
| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `10000` | Server listen port |
| `APP_SECRET` | `aura_sk_2025_...` | API authentication key (set in Settings UI) |
| `DATABASE_URL` | *(Aiven PostgreSQL)* | Database connection string |

### AI Models
| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `GEMINI_API_KEY` | `AQ.Ab8RN6Lnjvslkg...` | **Live** | Primary AI model (planner, search, media, social) |
| `NVIDIA_API_KEY` | `nvapi-uVY93ASOOF...` | HTTP 404 (fallback still works) | Image generation fallback |

### Media Generation
| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `A2E_API_KEY` | `sk_eyJhbGciOiJIUz...` | **Live** | Primary image/video generation (5 image + 6 video models) |

### Web Scraping & Search
| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `FIRECRAWL_API_KEY` | `fc-a68d3f966f38...` | **Live** | Web scraping, content extraction |
| `STEEL_API_KEY` | `ste-kilqkIR9L1RVR...` | **Live** | Browser automation, session management |

### Social Media Actions
| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `COMPOSIO_API_KEY` | `ak_fPDfCvonmoqw...` | HTTP 410 (needs app connection) | Social media posting, 6 platforms |

### GitHub Integration
| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `GITHUB_TOKEN` | `ghp_1FXohoTi4fu...` | Active | Repo access, auto-deploy |

### Render Management
| Variable | Value | Purpose |
|----------|-------|---------|
| `RENDER_API_KEY` | `rnd_8iwDLwJu3K1I0...` | Render API proxy for env var management |

---

## 6. API Key Status (Live)

Endpoint: `GET /api/health/keys` (public, no auth)

| API | Status | Detail |
|-----|--------|--------|
| **A2E Media** | **LIVE** | API responsive |
| **Gemini AI** | **LIVE** | Models accessible |
| **Firecrawl** | **LIVE** | OK |
| **Steel** | **LIVE** | API accessible |
| NVIDIA | HTTP 404 | Endpoint changed — generate still works via different URL |
| Composio | HTTP 410 | Needs app connection setup (not a key issue) |

**4 of 6 core APIs connected and operational.**

---

## 7. Security Implementation

### Authentication
- **Type:** Static API key (`x-api-key` header)
- **Implementation:** tRPC `authedQuery` procedure throws `TRPCError` with code `UNAUTHORIZED`
- **Exempt endpoints:** `ping` (Render health checks), `GET /api/health/keys` (public status)
- **Dev mode:** Auth disabled when `NODE_ENV !== "production"`
- **Migration period:** If `APP_SECRET` not set, all requests allowed
- **Frontend:** tRPC client reads key from `localStorage["aura_api_key"]`
- **Settings UI:** Enter APP_SECRET at Settings -> App Authentication

### CORS
- **Origin whitelist:** `https://project-c-64qo.onrender.com`, `http://localhost:5173`, `http://localhost:3000`
- **Preflight:** Proper OPTIONS handling with 204 response
- **Credentials:** `Access-Control-Allow-Credentials: true`

### Rate Limiting
- **Window:** 60 seconds
- **Max:** 120 requests per IP per minute
- **Response:** 429 when exceeded
- **Storage:** In-memory Map (resets on deploy)

### Security Headers
| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (prod only) |

### API Key Protection
- All API keys stored in server-side `process.env` only
- Frontend never sees key values (only names)
- Settings page shows "Live"/"Down" status, never key values
- `.gitignore` excludes `.env` files
- GitHub secret scanning blocks accidental commits

---

## 8. AI Integration Details

### AI Execution Formula
```
E = R[(G + C + K + T + M) -> O -> P -> A -> V -> d -> F]
```
- **E** = Execution Result
- **R** = Runtime (AIExecutionRuntime class)
- **G+C+K+T+M** = Inputs (Goal, Context, Knowledge, Tools, Memory)
- **O** = Observe, **P** = Plan, **A** = Act, **V** = Verify
- **d** = Correct, **F** = Finalize

### 6 Execution Phases
1. **INIT** — Load context and memory
2. **OBSERVE** — Gather current state
3. **PLAN** — Generate action plan
4. **ACT** — Execute plan
5. **VERIFY** — Validate results (V=TRUE -> FINAL; V=FALSE -> CORRECT+REPEAT)
6. **CORRECT** — Fix errors and retry

### Multi-Model Router (5 Models)
| Model | Role | Assignment |
|-------|------|------------|
| Gemini 2.0 Flash | Fast general purpose | Search, media, social tasks |
| Llama 3.1 70B | Complex reasoning | Planner agent |
| Llama 3.1 8B | Fast inference | Simple tasks |
| Mixtral 8x7B | Balanced | General queries |
| Mistral 7B | Lightweight | Quick responses |

### Resilience
- **Circuit breaker:** 3 failures -> open (30s timeout)
- **Exponential backoff:** `BASE_DELAY * 2^attempt` on 429
- **Request throttling:** 300ms global minimum interval

### Media Generation (A2E Primary, NVIDIA Fallback)

#### Image Models (5)
| Model | ID | Strength |
|-------|-----|----------|
| A2E | `a2e` | Balanced quality (default) |
| SeeDream | `seedream` | Ultra-realistic |
| Flux 2 | `flux2` | High detail |
| NanoBanana | `nanobanana` | Fast generation |
| GPT Image | `gptimage` | Best for text |

#### Video Models (4)
| Model | ID | Strength |
|-------|-----|----------|
| Kling | `kling` | Best quality (default) |
| Veo | `veo` | Google model |
| Wan | `wan` | Smooth motion |
| Seedance | `seedance` | Cinematic |

#### Video Pipeline
1. Generate image from prompt (A2E image model)
2. Generate video from image + prompt (A2E video model)
3. Return video URL + thumbnail

#### Fallback Chain
```
A2E image -> success? return URL
  -> fail? NVIDIA SDXL image -> return base64
A2E video -> success? return video URL
  -> fail? NVIDIA thumbnail + placeholder video
```

---

## 9. Database Schema

### Tables (9 total)
| Table | Purpose |
|-------|---------|
| `books` | Book catalog entries |
| `campaigns` | Marketing campaigns |
| `posts` | Social media scheduled posts |
| `media_assets` | Generated images/videos |
| `agent_tasks` | AI agent task queue |
| `agent_messages` | Agent conversation history |
| `scratch_pad` | Global memory entries |
| `agent_scratch_pad` | Per-agent memory |
| `reflection_log` | Decision reflection records |

### Auto-Sync
- Schema syncs on every server boot via `syncSchema()`
- Checks table existence, creates missing tables
- Safe to run multiple times (idempotent)
- Uses `drizzle-orm/pg-core` (PostgreSQL)

---

## 10. API Endpoints

### tRPC Sub-Routers (14)
| Router | Endpoints | Auth |
|--------|-----------|------|
| `ping` | `.query()` -> `{ok, ts}` | public |
| `books` | `.list`, `.create`, `.update`, `.delete` | authed |
| `campaigns` | `.list`, `.create`, `.update`, `.delete` | authed |
| `posts` | `.list`, `.create`, `.update`, `.delete`, `.schedule` | authed |
| `media` | `.list`, `.listByBook`, `.create`, `.update`, `.delete` | authed |
| `agents` | `.list`, `.listTasks`, `.listMessages`, `.create`, `.update` | authed |
| `search` | `.web`, `.trends` | authed |
| `social` | `.publish`, `.schedule`, `.analytics` | authed |
| `generate` | `.image(prompt, model?)`, `.video(prompt, model?)` | authed |
| `composio` | `.listActions`, `.execute`, `.connect` | authed |
| `runtime` | `.execute`, `.status`, `.logs` | authed |
| `crew` | `.run`, `.status`, `.results` | authed |
| `cron` | `.list`, `.create`, `.delete`, `.run` | authed |
| `smart` | `.chat`, `.intent`, `.suggest` | authed |
| `scratchPad` | `.list`, `.create`, `.delete`, `.getStats`, `.listSkills` | authed |

### Direct HTTP Endpoints (public, no auth)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health/keys` | GET | Live API key health status |
| `/api/proxy/env-status` | GET | Env var presence check |
| `/api/proxy/set-env` | POST | Set env vars on Render |
| `/api/proxy/deploy` | POST | Trigger Render deploy |

---

## 11. Pages & Routes

| Route | Component | Hero Image | Status |
|-------|-----------|------------|--------|
| `/` | Dashboard | `hero-dashboard.jpg` | Live |
| `/books` | Books | `hero-books.jpg` | Live |
| `/campaigns` | Campaigns | `hero-campaigns.jpg` | Live |
| `/agents` | AgentHub | `hero-agents.jpg` | Live |
| `/media` | MediaGallery | `hero-media.jpg` | Live |
| `/posts` | PostScheduler | `hero-posts.jpg` | Live |
| `/scratch-pad` | ScratchPad | `hero-scratch.jpg` | Live |
| `/skills` | Skills | `hero-skills.jpg` | Live |
| `/learn` | Learn | `hero-learn.jpg` | Live |
| `/settings` | Settings | `hero-settings.jpg` | Live |
| `/chat` | SmartChat | `hero-chat.jpg` | Live |

**All 11 routes verified returning 200 with SPA.**

---

## 12. Deploy History

| Commit | Date | Description |
|--------|------|-------------|
| `cce9180` | 2026-07-06 | Security hardening: CORS, auth, rate limiting, A2E timeouts |
| `3eddddc` | 2026-07-06 | A2E media primary, live key verification, missing hero images |
| `7967332` | 2026-07-06 | Auth exemption for health endpoint |
| `40746b4` | 2026-07-06 | Public `/api/health/keys` endpoint, fetch-based Settings |
| `dc4ee0d` | 2026-07-06 | tRPC auth: TRPCError instead of plain JSON, authedQuery |
| `ed44d9b` | 2026-07-06 | Render blueprint (`render.yaml`) |
| `cce9180` | 2026-07-06 | Security fixes: CORS, auth, rate limiting |
| `0475f10` | 2026-07-06 | Proxy endpoints for env var management |
| `aa18823` | 2026-07-06 | Original: fix(runtime): safe getInsertId utility |

---

## 13. Known Issues

| Issue | Severity | Status | Note |
|-------|----------|--------|------|
| NVIDIA API returns 404 on health check | Low | Expected | Image generation still works via different URL |
| Composio returns 410 | Low | Expected | Needs app connection setup (not a key issue) |
| Free tier cold start | Low | By design | First request after 15min idle takes 30-50s |
| `db/relations.ts` is empty | Low | Works without | FK constraints handled at app level |
| `cron_jobs` table in sync but not schema | Low | Non-critical | Table not actively used |
| 31 console.log statements | Low | Cleanup later | No sensitive data leaked |
| PostgreSQL (not MySQL as originally documented) | Info | Works fine | Aiven supports both; code uses `pg-core` |

---

## 14. Quick Commands

```bash
# Local development
cd PROJECT-C
npm install
npm run dev          # Vite dev server + Hono API

# Build & start
npm run build        # Vite frontend + esbuild backend
npm start            # Production server (node dist/index.js)

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Drizzle Studio GUI

# Code quality
npm run check        # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier
```

### Render Dashboard
- **Service:** https://dashboard.render.com/web/srv-d94s6vhkh4rs73fmllbg
- **Env vars:** https://dashboard.render.com/web/srv-d94s6vhkh4rs73fmllbg/env
- **Deploy trigger:** Manual Deploy -> Deploy latest commit

### Health Check
```bash
# Public endpoint (no auth)
curl https://project-c-64qo.onrender.com/api/health/keys

# tRPC ping (no auth)
curl https://project-c-64qo.onrender.com/api/trpc/ping

# Authenticated request
curl -H "x-api-key: YOUR_APP_SECRET" \
  https://project-c-64qo.onrender.com/api/trpc/books.list
```

---

## 15. Login Credentials

### Render Dashboard
- **URL:** https://dashboard.render.com
- **Email:** SladeProductionsFl@gmail.com
- **Password:** Production1
- **Login method:** Google SSO recommended

### App Authentication
1. Open https://project-c-64qo.onrender.com
2. Go to **Settings -> App Authentication**
3. Enter APP_SECRET (see Render env vars)
4. Click **Save**

---

*This handoff document was auto-generated on 2026-07-06.*
*For updates, edit `HANDOFF.md` in the repo root and commit.*
