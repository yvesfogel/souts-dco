# SOUTS DCO — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SOUTS DCO Platform                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Ad Placements │
                              │  (iframe/JS)    │
                              └────────┬────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             FastAPI Backend                                   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   /ad/{id}  │  │  /campaigns │  │   /assets   │  │    /analytics       │ │
│  │  Ad Serving │  │    CRUD     │  │   Storage   │  │  Impressions/Clicks │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │            │
│         └────────────────┴────────────────┴─────────────────────┘            │
│                                    │                                         │
│  ┌─────────────────────────────────┴────────────────────────────────────┐   │
│  │                        Core Services                                  │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐  ┌───────────────┐  ┌───────────────────────┐  │   │
│  │  │ Signal Collector │  │  Decisioning  │  │   Template Renderer   │  │   │
│  │  │                  │  │    Engine     │  │                       │  │   │
│  │  │  • Geo (IP→loc) │  │               │  │  • default            │  │   │
│  │  │  • Weather      │  │  1. Rules     │  │  • minimal            │  │   │
│  │  │  • Daypart      │  │  2. Weights   │  │  • hero               │  │   │
│  │  │  • Device       │  │  3. Default   │  │  • split              │  │   │
│  │  │                  │  │               │  │  • banner             │  │   │
│  │  └────────┬─────────┘  └───────┬───────┘  └───────────┬───────────┘  │   │
│  │           │                    │                       │              │   │
│  │           └────────────────────┴───────────────────────┘              │   │
│  │                                │                                       │   │
│  │  ┌─────────────────────────────┴─────────────────────────────────┐   │   │
│  │  │                    Resilience Layer                            │   │   │
│  │  │  • Circuit Breakers (geo/weather)  • Rate Limiting            │   │   │
│  │  │  • Caching (5-10 min)              • Graceful Degradation     │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              Supabase                                         │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │   PostgreSQL    │  │    Auth         │  │        Storage              │   │
│  │                 │  │                 │  │                             │   │
│  │  • campaigns    │  │  • JWT tokens   │  │  • Ad assets (images)       │   │
│  │  • variants     │  │  • RLS policies │  │  • Uploads                  │   │
│  │  • rules        │  │  • User mgmt    │  │                             │   │
│  │  • assets       │  │                 │  │                             │   │
│  │  • impressions  │  │                 │  │                             │   │
│  │  • clicks       │  │                 │  │                             │   │
│  │  • organizations│  │                 │  │                             │   │
│  │  • api_keys     │  │                 │  │                             │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                           External APIs                                       │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │   ip-api.com    │  │ OpenWeatherMap  │  │       OpenAI API            │   │
│  │   (Geo lookup)  │  │   (Weather)     │  │  (AI Creative Generation)   │   │
│  │                 │  │                 │  │                             │   │
│  │  Free tier OK   │  │  Optional       │  │  Optional                   │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow: Ad Serving

```
Browser Request                    Backend Processing
     │
     ▼
GET /ad/{campaign_id}
     │
     ├─── Extract IP ────────────► Geo Lookup (ip-api.com)
     │                              └── country, city, region
     │
     ├─── Get Lat/Lon ───────────► Weather Lookup (OpenWeatherMap)
     │                              └── condition, temp, humidity
     │
     ├─── Server Time ───────────► Daypart Calculation
     │                              └── morning/afternoon/evening/night
     │
     ├─── Collect Signals ───────► { geo_country, weather_condition, daypart, ... }
     │
     ▼
Decisioning Engine
     │
     ├─── Load Campaign ─────────► Supabase: campaigns + variants + rules
     │
     ├─── Evaluate Rules ────────► Match signals against rule conditions
     │                              Priority: highest matching wins
     │
     ├─── Apply Weights ─────────► If no rule match, weighted random
     │
     ├─── Default Fallback ──────► If no weights, first variant
     │
     ▼
Template Renderer
     │
     ├─── Select Template ───────► default | minimal | hero | split | banner
     │
     ├─── Inject Data ───────────► variant data + click URL + styling
     │
     ▼
HTML Response ───────────────────► Browser renders ad
     │
     └─── Track Impression ──────► Background: INSERT into impressions table
```

## Database Schema

```
┌─────────────────────┐      ┌─────────────────────┐
│     campaigns       │      │      variants       │
├─────────────────────┤      ├─────────────────────┤
│ id (uuid, PK)       │─────<│ campaign_id (FK)    │
│ name                │      │ id (uuid, PK)       │
│ status              │      │ name                │
│ ab_test_mode        │      │ headline            │
│ start_date          │      │ body_text           │
│ end_date            │      │ image_url           │
│ user_id             │      │ cta_text            │
│ org_id (nullable)   │      │ cta_url             │
│ created_at          │      │ weight              │
└─────────────────────┘      │ is_default          │
                             │ is_control          │
                             │ auto_generated      │
                             └─────────────────────┘

┌─────────────────────┐      ┌─────────────────────┐
│       rules         │      │       assets        │
├─────────────────────┤      ├─────────────────────┤
│ id (uuid, PK)       │      │ id (uuid, PK)       │
│ variant_id (FK)     │─────>│ campaign_id (FK)    │
│ signal              │      │ name                │
│ operator            │      │ url                 │
│ value               │      │ type                │
│ priority            │      │ folder              │
│ created_at          │      │ tags[]              │
└─────────────────────┘      │ created_at          │
                             └─────────────────────┘

┌─────────────────────┐      ┌─────────────────────┐
│    impressions      │      │       clicks        │
├─────────────────────┤      ├─────────────────────┤
│ id (uuid, PK)       │      │ id (uuid, PK)       │
│ campaign_id (FK)    │      │ campaign_id (FK)    │
│ variant_id (FK)     │      │ variant_id (FK)     │
│ signals (jsonb)     │      │ signals (jsonb)     │
│ ip_address          │      │ ip_address          │
│ created_at          │      │ created_at          │
└─────────────────────┘      └─────────────────────┘

┌─────────────────────┐      ┌─────────────────────┐
│   organizations     │      │   org_memberships   │
├─────────────────────┤      ├─────────────────────┤
│ id (uuid, PK)       │─────<│ org_id (FK)         │
│ name                │      │ user_id (FK)        │
│ slug                │      │ role                │
│ logo_url            │      │ created_at          │
│ settings (jsonb)    │      └─────────────────────┘
│ created_at          │
└─────────────────────┘      ┌─────────────────────┐
                             │      api_keys       │
┌─────────────────────┐      ├─────────────────────┤
│   component_pools   │      │ id (uuid, PK)       │
├─────────────────────┤      │ user_id (FK)        │
│ id (uuid, PK)       │      │ name                │
│ campaign_id (FK)    │      │ key_hash            │
│ component           │      │ key_prefix          │
│ values[]            │      │ scopes[]            │
│ created_at          │      │ expires_at          │
└─────────────────────┘      │ last_used_at        │
                             │ revoked_at          │
                             └─────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | Admin dashboard |
| | TailwindCSS | Styling |
| | React Router | Navigation |
| | Recharts | Analytics charts |
| **Backend** | FastAPI (Python 3.11) | API server |
| | Pydantic | Data validation |
| | Jinja2 | Ad templates |
| | slowapi | Rate limiting |
| **Database** | Supabase (PostgreSQL) | Primary storage |
| | RLS Policies | Row-level security |
| **Auth** | Supabase Auth | JWT-based auth |
| **Storage** | Supabase Storage | Asset hosting |
| **External** | ip-api.com | IP geolocation |
| | OpenWeatherMap | Weather data |
| | OpenAI API | AI creative generation |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Production                               │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     Vercel                               │   │
│   │                                                         │   │
│   │   React Frontend (Static)                               │   │
│   │   └── Edge CDN for global distribution                  │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Railway / Heroku / Fly.io                   │   │
│   │                                                         │   │
│   │   FastAPI Backend                                       │   │
│   │   └── Auto-scaling                                      │   │
│   │   └── SSL termination                                   │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                     Supabase                             │   │
│   │                                                         │   │
│   │   PostgreSQL + Auth + Storage                           │   │
│   │   └── Managed, auto-backups                             │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Estimated Cost: ~$5-25/month (depending on traffic)
```

## Security Model

### Authentication Flow
1. User logs in via Supabase Auth (email/password or OAuth)
2. Receives JWT token with user claims
3. Frontend includes token in Authorization header
4. Backend validates token via Supabase client
5. RLS policies enforce data access at DB level

### API Keys (for external integrations)
1. User generates API key in dashboard
2. Key shown once, hashed for storage
3. External requests include key in header
4. Backend validates hash, checks scopes
5. Rate limits applied per key

### Row-Level Security
```sql
-- Users can only see their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = user_id);

-- Or campaigns in their organizations
CREATE POLICY "Org members can view org campaigns"
  ON campaigns FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  ));
```

## Resilience Patterns

### Circuit Breakers
- Geo API: 3 failures → 30s cooldown
- Weather API: 3 failures → 30s cooldown
- Graceful degradation to defaults

### Caching
- Geo results: 10 min TTL (IP→location rarely changes)
- Weather: 5 min TTL
- Campaign data: Request-scoped (fresh each request)

### Rate Limiting
- Ad serving: 100 req/min per IP
- Debug/simulate: 30 req/min
- API endpoints: 60 req/min

---

*Generated: February 6, 2026*
