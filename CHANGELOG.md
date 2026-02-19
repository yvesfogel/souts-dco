# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **CI/CD Pipeline** (2026-02-06)
  - `.github/workflows/pr-check.yml` - PR validation (lint + test)
  - `.github/workflows/deploy-staging.yml` - Auto-deploy to develop
  - `.github/workflows/deploy-production.yml` - Production with approval
  - Pre-commit hooks config (`.pre-commit-config.yaml`)
  - Ruff config (`backend/pyproject.toml`)
  - ESLint config (`frontend/.eslintrc.cjs`)

- **Demo Data Seeder** (2026-02-06)
  - `scripts/seed-demo-data.py` - Populates database with realistic demo data
  - Creates campaigns, assets, pools, rules, analytics events, API keys
  - 30 days of impressions/clicks for analytics testing
  - `docs/DEMO-DATA.md` - Usage guide

- **API Keys** (2026-02-06)
  - External integration authentication (`supabase/migrations/006_api_keys.sql`)
  - Key management endpoints (create, list, revoke)
  - Scopes: serve, read, write, analytics, admin
  - Frontend UI in `APIKeysPage.jsx`
  - SHA-256 hashed storage, expiry support

- **Bulk Asset Upload** (2026-02-06)
  - Folder organization for assets (`supabase/migrations/007_bulk_assets.sql`)
  - Tag-based filtering and search
  - GIN indexes for fast queries

- **Multi-Tenant** (2026-02-06)
  - Organizations/teams support (`supabase/migrations/008_multi_tenant.sql`)
  - Role-based permissions (owner, admin, member, viewer)
  - Invitation system
  - RLS policies per organization

- **AI Creative Generation** (2026-02-06)
  - AI generation schema (`supabase/migrations/009_ai_generation.sql`)
  - Prompt templates library
  - Usage tracking per user/org
  - Monthly limits and cost tracking

### Planned
- Analytics dashboard with KPI overview
- Video DCO with Remotion
- Audience segments (CDP/DMP integration)

## [0.1.0] - 2026-02-05

### Added
- **Core Platform**
  - Campaign management (CRUD)
  - Variant management with weights
  - Rules engine with conditions
  - A/B testing modes (rules+weights, pure A/B, off)
  - Campaign scheduling (start/end dates)

- **Signal System**
  - Geo signals (country, city) via ip-api.com
  - Weather signals (temp, conditions) via Open-Meteo
  - Daypart signals (morning/afternoon/evening/night, weekday/weekend)
  - Signal-based variant selection

- **Ad Serving**
  - `/ad/{campaign_id}` - Personalized HTML delivery
  - `/ad/{campaign_id}?format=json` - JSON response with signals
  - `/ad/{campaign_id}/debug` - Debug endpoint with timing metrics
  - `/ad/{campaign_id}/simulate` - Signal simulation
  - 5 responsive templates: default, minimal, hero, split, banner

- **Analytics**
  - Impression tracking (background)
  - Click tracking
  - Daily breakdown
  - Signal distribution

- **Asset Management**
  - Image upload to Supabase Storage
  - Public URLs for ad serving

- **Authentication**
  - Supabase Auth integration
  - Protected routes

- **Reliability**
  - Circuit breakers for geo/weather APIs
  - Rate limiting (slowapi)
  - Structured logging
  - Graceful degradation

- **Documentation**
  - SETUP.md - Development setup
  - DEPLOY.md - Production deployment
  - DEPLOY-QUICKSTART.md - 15-min deploy guide
  - API_REFERENCE.md - API documentation
  - FRONTEND-GUIDE.md - Frontend developer guide
  - CODE-REVIEW.md - Backend code review
  - FRONTEND-CODE-REVIEW.md - Frontend code review
  - tests/TESTING.md - E2E testing guide

- **Feature Specs** (docs/)
  - API-KEYS-SPEC.md
  - CI-CD-SPEC.md
  - ANALYTICS-DASHBOARD-SPEC.md
  - BULK-ASSET-UPLOAD-SPEC.md
  - MULTI-TENANT-SPEC.md
  - AI-CREATIVE-GEN-SPEC.md

### Technical
- FastAPI 0.104+ (Python 3.11)
- React 18 + Vite + TailwindCSS
- Supabase (PostgreSQL, Auth, Storage)
- httpx for async HTTP
- slowapi for rate limiting

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 0.1.0 | 2026-02-05 | MVP release, all core features |

---

*For detailed commit history, see git log.*
