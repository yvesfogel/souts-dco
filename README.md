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
- 🖼️ **Multi-variant campaigns**: Multiple creatives per campaign
- 🔐 **Authentication**: Supabase Auth
- 📁 **Asset management**: Upload images to Supabase Storage
- ⚡ **Fast serving**: <100ms ad delivery

## Quick Start

### 1. Setup Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial.sql`
3. Create a storage bucket named `assets` (public)
4. Copy your project URL and keys

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env with your Supabase credentials

# Run
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Supabase credentials

# Run
npm run dev
```

### 4. Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Ad Serving

Once you create a campaign with variants:

```
GET /ad/{campaign_id}         # Returns personalized HTML
GET /ad/{campaign_id}?format=json  # Returns JSON with signals
GET /ad/{campaign_id}/debug   # Debug signals & selected variant
```

## Signals

| Signal | Description | Example Values |
|--------|-------------|----------------|
| `geo_country` | Country name | "United States" |
| `geo_city` | City name | "New York" |
| `weather_temp` | Temperature (°C) | 25 |
| `weather_is_hot` | Temp >= 30°C | true/false |
| `weather_is_cold` | Temp < 15°C | true/false |
| `weather_is_rainy` | Rain/drizzle/storm | true/false |
| `daypart` | Time of day | "morning", "afternoon", "evening", "night" |
| `daypart_is_weekend` | Saturday/Sunday | true/false |

## Rule Example

Show "Summer Sale" variant when it's hot:

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

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
WEATHER_API_KEY=xxx  # OpenWeatherMap
```

### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Docker

```bash
docker-compose up --build
```

## License

MIT - SOUTS 2026
