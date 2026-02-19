# SOUTS DCO

Dynamic Creative Optimization platform by SOUTS.

Serve personalized ad creatives based on real-time signals: **weather**, **location**, **time of day**, and more.

## Status: ✅ MVP Ready

The platform is feature-complete and production-ready. See [STATUS_REPORT.md](STATUS_REPORT.md) for details.

## Stack

- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React + Vite + TailwindCSS
- **Database/Auth/Storage**: Supabase

## Documentation

| Doc | Description |
|-----|-------------|
| [SETUP.md](SETUP.md) | Full setup instructions |
| [DEPLOY.md](DEPLOY.md) | Deployment guide |
| [DEPLOY-QUICKSTART.md](DEPLOY-QUICKSTART.md) | 15-min deploy guide |
| [API_REFERENCE.md](API_REFERENCE.md) | API endpoints reference |
| [FRONTEND-GUIDE.md](FRONTEND-GUIDE.md) | Frontend developer guide |
| [CODE-REVIEW.md](CODE-REVIEW.md) | Backend code review |
| [FRONTEND-CODE-REVIEW.md](FRONTEND-CODE-REVIEW.md) | Frontend code review |
| [STATUS_REPORT.md](STATUS_REPORT.md) | Project status & metrics |
| [tests/TESTING.md](tests/TESTING.md) | Testing guide (E2E) |
| [docs/](docs/) | Feature specs index (~105h of planned work) |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [SECURITY.md](SECURITY.md) | Security policy & practices |

## Features

- 🎯 **Signal-based decisioning**: Geo, weather, daypart signals
- 📊 **Rules engine**: Define conditions to match variants
- 🔀 **A/B Testing**: Traffic splitting with configurable weights
- 📅 **Scheduling**: Start/end dates for campaigns
- 🎨 **Multi-template**: 5 responsive ad templates
- 📈 **Analytics**: Impressions, daily trends, signal breakdown
- 🖼️ **Multi-variant campaigns**: Multiple creatives per campaign
- 🔐 **Authentication**: Supabase Auth
- 📁 **Asset management**: Upload images to Supabase Storage
- ⚡ **Fast serving**: <100ms ad delivery
- 📋 **Embed codes**: Ready-to-use HTML/JS snippets
- 🛡️ **Circuit breakers**: Graceful degradation for external APIs
- 🚦 **Rate limiting**: Protection against abuse
- 📊 **Performance metrics**: Timing data in debug endpoint

## Quick Start

See [SETUP.md](SETUP.md) for detailed instructions.

### TL;DR

1. Create a [Supabase](https://supabase.com) project
2. Run migrations from `supabase/migrations/`
3. Create storage bucket `assets` (public)
4. Configure `.env` files
5. Run backend & frontend

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend  
cd frontend && npm install && npm run dev
```

## Ad Serving

```
GET /ad/{campaign_id}                    # Personalized HTML
GET /ad/{campaign_id}?format=json        # JSON with signals
GET /ad/{campaign_id}?template=hero      # Specific template
GET /ad/{campaign_id}/debug              # Debug signals
GET /ad/{campaign_id}/simulate?signal_*  # Test with custom signals
GET /ad/templates                        # List templates
```

## Templates

| Template | Best For |
|----------|----------|
| `default` | All sizes, versatile |
| `minimal` | Simple, clean ads |
| `hero` | Large images, overlays |
| `split` | Side-by-side layouts |
| `banner` | Leaderboard/banner sizes |

## Signals

| Signal | Description |
|--------|-------------|
| `geo_country` | Country name |
| `geo_city` | City name |
| `weather_temp` | Temperature (°C) |
| `weather_is_hot` | Temp >= 30°C |
| `weather_is_cold` | Temp < 15°C |
| `weather_is_rainy` | Rain/drizzle/storm |
| `daypart` | morning/afternoon/evening/night |
| `daypart_is_weekend` | Saturday/Sunday |

## A/B Testing Modes

- **Rules + Weights**: Try rules first, fallback to weighted selection
- **Pure A/B**: Ignore rules, split by weights only
- **Off**: Always show default variant

## Rule Example

Show "Summer Sale" variant when hot:

```json
{
  "name": "Hot Weather Rule",
  "variant_id": "...",
  "conditions": [
    { "field": "weather_is_hot", "operator": "eq", "value": true }
  ],
  "priority": 1
}
```

## Screenshots

*(Coming soon)*

## Roadmap

### Done ✅
- [x] E2E Testing suite
- [x] Circuit breakers for external APIs
- [x] Rate limiting
- [x] Performance metrics
- [x] Structured logging
- [x] Deploy documentation

### Next 🔜 (Specs Complete ✅)
- [ ] API keys for external integration — [spec](docs/API-KEYS-SPEC.md) ~10h
- [ ] CI/CD pipeline — [spec](docs/CI-CD-SPEC.md) ~8h
- [ ] Analytics dashboard — [spec](docs/ANALYTICS-DASHBOARD-SPEC.md) ~15h
- [ ] Bulk asset upload — [spec](docs/BULK-ASSET-UPLOAD-SPEC.md) ~12h
- [ ] Multi-tenant (teams/orgs) — [spec](docs/MULTI-TENANT-SPEC.md) ~20h

### Future 🔮
- [ ] AI creative generation — [spec](docs/AI-CREATIVE-GEN-SPEC.md) ~40h
- [ ] Video DCO with Remotion
- [ ] Audience segments (CDP/DMP)

## License

MIT - SOUTS 2026
