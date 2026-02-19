# Demo Data Guide

This guide explains how to populate the DCO platform with realistic demo data for development, testing, and stakeholder demos.

## Quick Start

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"

# Run the seeder
python scripts/seed-demo-data.py

# Or clear existing data first
python scripts/seed-demo-data.py --clear
```

## What Gets Created

### Organizations (1)
- **SOUTS Demo** — Pro plan organization with AI generation and analytics features

### Campaigns (5)

| Campaign | Status | Signals |
|----------|--------|---------|
| Summer Sale 2026 | Active | weather, daypart, geo |
| Brand Awareness Q1 | Active | daypart, device |
| Product Launch - SmartWidget | Active | weather, geo, device |
| Retargeting - Cart Abandoners | Paused | daypart |
| Holiday Campaign 2025 | Archived | weather, daypart, geo |

### Assets (~50)

Organized by folder:
- `hero-images/` — Hero banners for different seasons
- `product-shots/` — Product photos in different colors
- `cta-buttons/` — Call-to-action buttons
- `backgrounds/` — Gradient and pattern backgrounds
- `videos/` — 15s and 30s promo videos

Each asset has:
- Realistic CDN URLs
- Appropriate tags for filtering
- Metadata (dimensions, duration)

### Variant Pools

Each active campaign gets 2-3 pools:
- **Default Pool** (random selection)
- **Weather-based Pool** (weighted by temperature)
- **Daypart Pool** (sequential rotation)

### Rules

Sample targeting rules:
- Hot Weather Hero (temp ≥ 25°C)
- Cold Weather Hero (temp ≤ 10°C)
- Morning/Evening Promos
- US Visitors
- Mobile Users

### Analytics Events

30 days of simulated data:
- **Impressions:** 100-1000 per day per campaign
- **Clicks:** 0.5-3% CTR
- **Signals captured:** weather, daypart, geo, device

This provides realistic data for the Analytics Dashboard.

### API Keys (3)

| Key | Status | Scopes |
|-----|--------|--------|
| Production Key | Active | serve, read, analytics |
| Development Key | Active | serve, read, write |
| Legacy Key | Revoked | serve |

## Using Demo Data

### For Development

1. Run the seeder against your local Supabase
2. Start the backend: `uvicorn app.main:app --reload`
3. Start the frontend: `npm run dev`
4. Login and explore the pre-populated data

### For Testing

The seeded data is designed to test:
- ✅ Multiple campaign states (active/paused/archived)
- ✅ Asset organization (folders, tags)
- ✅ Pool selection logic (random/weighted/sequential)
- ✅ Rule evaluation (weather, daypart, geo, device)
- ✅ Analytics aggregation (CTR, trends)
- ✅ API key management

### For Demos

Perfect for stakeholder presentations:
- Real-looking campaigns with professional names
- Analytics dashboard shows meaningful trends
- Multiple scenarios to demonstrate

## Customization

Edit `scripts/seed-demo-data.py` to:
- Change campaign names/descriptions
- Add more assets
- Adjust event generation (date range, volume)
- Modify rule configurations

## Troubleshooting

### "SUPABASE_SERVICE_KEY must be set"
Use the **service role key** (not anon key) from Supabase dashboard:
Settings → API → service_role (secret)

### "Could not create organization"
Multi-tenant tables may not exist. Run migration 008 first:
```bash
psql $DATABASE_URL < supabase/migrations/008_multi_tenant.sql
```

### "Could not clear table X"
Some tables may not exist if migrations haven't run. This is safe to ignore.

### Duplicate key errors
Run with `--clear` to remove existing demo data first.

## Re-seeding

To get fresh demo data:

```bash
# Clear and re-seed
python scripts/seed-demo-data.py --clear
```

This removes all existing data and creates new records with fresh UUIDs.

---

*Created: February 6, 2026*
