# 🚀 Deploy Quickstart

**TL;DR:** 15 minutos para tener DCO corriendo en producción.

---

## Prerequisites

- [ ] Cuenta Supabase (free tier OK)
- [ ] Cuenta Heroku o Railway (backend)
- [ ] Cuenta Vercel (frontend)
- [ ] OpenWeatherMap API key (optional)

---

## Step 1: Supabase Setup (5 min)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick name, password, region (sa-east-1 for LATAM)
3. Wait for project to initialize (~2 min)

### 1.2 Run Schema
1. Dashboard → **SQL Editor** → New query
2. Copy entire contents of `supabase/FULL_SCHEMA.sql`
3. Click **Run** → Should see "Success"

### 1.3 Create Storage Bucket
1. Dashboard → **Storage** → New bucket
2. Name: `assets`
3. Check **Public bucket** ✅
4. Create

### 1.4 Get Keys
Dashboard → **Settings** → **API**, copy:
- `Project URL`: https://xxxxx.supabase.co
- `anon public`: eyJhbGc... (long one)
- `service_role`: eyJhbGc... (other long one, SECRET)

---

## Step 2: Backend Deploy (5 min)

### Option A: Heroku

```bash
# Login
heroku login
heroku create souts-dco-api

# Set env vars
heroku config:set SUPABASE_URL=https://xxxxx.supabase.co
heroku config:set SUPABASE_ANON_KEY=eyJhbGc...
heroku config:set SUPABASE_SERVICE_KEY=eyJhbGc...
heroku config:set WEATHER_API_KEY=your-key  # optional

# Deploy
cd backend
git init
git add .
git commit -m "Initial"
heroku git:remote -a souts-dco-api
git push heroku main

# Verify
heroku open /health
```

### Option B: Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select repo, set root directory to `backend`
3. Add environment variables (same as above)
4. Deploy → Get public URL

**Backend URL:** `https://souts-dco-api.herokuapp.com` (save this)

---

## Step 3: Frontend Deploy (3 min)

### Vercel

```bash
cd frontend
npm i -g vercel
vercel login

# Set env during deploy
vercel --build-env VITE_SUPABASE_URL=https://xxxxx.supabase.co \
       --build-env VITE_SUPABASE_ANON_KEY=eyJhbGc... \
       --build-env VITE_API_URL=https://souts-dco-api.herokuapp.com

# Or via dashboard:
# 1. vercel.com → Import → Select repo
# 2. Root Directory: frontend
# 3. Environment Variables: add the 3 above
# 4. Deploy
```

**Frontend URL:** `https://souts-dco.vercel.app`

---

## Step 4: Verify (2 min)

```bash
# Backend health
curl https://your-backend.herokuapp.com/health
# → {"status":"ok"}

# Templates
curl https://your-backend.herokuapp.com/ad/templates
# → ["default","minimal","hero","split","banner"]

# Frontend
open https://your-frontend.vercel.app
# → Login page should load
```

---

## Quick Reference

| Service | URL |
|---------|-----|
| Frontend | https://souts-dco.vercel.app |
| Backend API | https://souts-dco-api.herokuapp.com |
| API Docs | https://souts-dco-api.herokuapp.com/docs |
| Supabase | https://app.supabase.com/project/xxxxx |

---

## Environment Variables Cheatsheet

### Backend (.env or hosting config)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
WEATHER_API_KEY=abc123  # optional
```

### Frontend (.env or Vercel)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://souts-dco-api.herokuapp.com
```

---

## Post-Deploy Checklist

- [ ] Create user account via frontend
- [ ] Create test campaign
- [ ] Add variant with image
- [ ] Test ad serving: `GET /ad/{campaign_id}`
- [ ] Check analytics after a few impressions
- [ ] Test click tracking (click CTA, check analytics)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check Supabase keys are correct |
| "relation does not exist" | Run FULL_SCHEMA.sql in SQL Editor |
| CORS errors | Backend CORS allows vercel.app by default; add custom domain if needed |
| No ads showing | Check campaign is active + has variants |
| 500 on ad serve | Check backend logs: `heroku logs --tail` |

---

## Cost Estimate (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Supabase | Free | $0 |
| Heroku | Eco | $5 |
| Vercel | Hobby | $0 |
| OpenWeatherMap | Free | $0 |
| **Total** | | **$5/mo** |

Scale up as needed. Supabase Pro ($25) for more DB/storage.

---

*Created by Dico - 2026-02-05*
