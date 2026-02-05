# SOUTS DCO

Dynamic Creative Optimization platform by SOUTS.

Serve personalized ad creatives based on real-time signals: **weather**, **location**, **time of day**, and more.

## Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite + TailwindCSS
- **Database/Auth/Storage**: Supabase

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

- [ ] Bulk asset upload
- [ ] Dashboard overview
- [ ] API keys for external integration
- [ ] Video DCO with Remotion
- [ ] AI creative generation

## License

MIT - SOUTS 2026
