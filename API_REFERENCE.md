# SOUTS DCO — API Reference

> Base URL (local): `http://localhost:8000`
> 
> Auth: Bearer token via `Authorization: Bearer <access_token>`

## Health
- **GET** `/health` → `{ status: "ok", service: "souts-dco" }`

---

## Auth (`/api/auth`)
- **POST** `/signup` → create user, returns token
- **POST** `/login` → returns token
- **POST** `/logout` → invalidate session
- **GET** `/me` → current user

**Payloads**
- `UserCreate` / `UserLogin`:
```json
{ "email": "user@example.com", "password": "..." }
```

---

## Campaigns (`/api/campaigns`)
- **GET** `` → list campaigns
- **POST** `` → create campaign
- **GET** `/{campaign_id}` → campaign + variants + rules
- **PATCH** `/{campaign_id}` → update campaign
- **DELETE** `/{campaign_id}` → delete campaign
- **POST** `/{campaign_id}/duplicate` → duplicate campaign + variants + rules

### Variants
- **POST** `/{campaign_id}/variants`
- **PATCH** `/{campaign_id}/variants/{variant_id}`
- **DELETE** `/{campaign_id}/variants/{variant_id}`

### Rules
- **POST** `/{campaign_id}/rules`
- **PATCH** `/{campaign_id}/rules/{rule_id}`
- **DELETE** `/{campaign_id}/rules/{rule_id}`

---

## Assets (`/api/assets`)
- **POST** `/upload` (multipart/form-data)
  - fields: `campaign_id`, `name`, `file`
- **GET** `/{campaign_id}` → list assets
- **DELETE** `/{asset_id}` → delete asset

**Allowed types:** JPG, PNG, GIF, WEBP

---

## Ad Serving (`/ad`)
- **GET** `/templates` → list available templates
- **GET** `/{campaign_id}` → serve ad
  - query: `format=html|json`, `track=true|false`, `width`, `height`, `template`
- **GET** `/{campaign_id}/preview` → preview specific variant
  - query: `variant_id`, `template`, `width`, `height`
- **GET** `/{campaign_id}/debug` → collected signals + selected variant
- **GET** `/{campaign_id}/simulate` → simulate with `signal_*` params

**Examples**
```
/ad/{campaign_id}?format=json
/ad/{campaign_id}/simulate?signal_weather_temp=30&signal_daypart=morning
```

---

## Analytics (`/api/analytics`)
- **GET** `/click/{campaign_id}/{variant_id}?url=...` → track + redirect
- **POST** `/click` → track (AJAX)
- **POST** `/impression` → track impression
- **GET** `/campaigns/{campaign_id}/stats?days=7` → campaign stats
- **GET** `/dashboard` → overview stats

---

## Component Pools (`/api/pools`)
- **GET** `/{campaign_id}` → pools + total combinations
- **PUT** `/{campaign_id}/{pool_type}` → upsert pool
- **DELETE** `/{campaign_id}/{pool_type}` → delete pool
- **POST** `/{campaign_id}/generate` → generate variants
- **GET** `/{campaign_id}/preview` → preview combinations

**Pool types:** `headline`, `body`, `cta_text`, `cta_url`, `image`

---

## Notes
- Most endpoints require auth (Bearer token).
- Ad serving endpoints are public (no auth) but only serve **active + scheduled** campaigns.
- Signals collected: geo, weather, daypart + `user_agent`/`referer`.
