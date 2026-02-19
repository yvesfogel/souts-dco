# Analytics Dashboard Spec

Feature spec para el dashboard de analytics de souts-dco.

## Overview

Dashboard centralizado que muestra métricas de todas las campañas en una sola vista, con insights accionables y comparativas.

**Estado actual:** El analytics existe a nivel de campaña individual (`/campaigns/:id` muestra impressions, daily trends, signal breakdown). Falta una vista agregada.

## Objetivos

1. **Vista global** — Ver performance de todas las campañas en un vistazo
2. **Comparativas** — Identificar campañas top/bottom performers
3. **Trends** — Detectar patrones temporales (día/semana/mes)
4. **Actionable insights** — Sugerir optimizaciones

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Analytics Dashboard                                     [Last 7 days ▼] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │   IMPRESSIONS  │  │     CLICKS     │  │      CTR       │            │
│  │    124,532     │  │     2,891      │  │     2.32%      │            │
│  │    ↑ 12.4%     │  │    ↑ 8.2%      │  │    ↓ 0.3%      │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Impressions Over Time                        │  │
│  │   ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                                │  │
│  │   Mon Tue Wed Thu Fri Sat Sun Mon Tue Wed Thu Fri Sat Sun       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │    Top Campaigns              │  │    Signal Performance          │ │
│  │                               │  │                                │ │
│  │  1. Summer Sale    45,231 ▲   │  │  weather_is_hot    +34% CTR   │ │
│  │  2. New Arrivals   32,102 ▲   │  │  daypart=evening   +22% CTR   │ │
│  │  3. Weekend Deal   21,455 ▼   │  │  geo=Montevideo    +18% CTR   │ │
│  │  4. Mobile Promo   15,744 ▲   │  │  daypart=morning   -12% CTR   │ │
│  │  5. Holiday 2026   10,000 ─   │  │  weather_is_cold   -8% CTR    │ │
│  └───────────────────────────────┘  └────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Campaigns Table                             │  │
│  │ Campaign        Status   Impressions   Clicks   CTR    Trend    │  │
│  │ ─────────────────────────────────────────────────────────────── │  │
│  │ Summer Sale     Active      45,231     1,102   2.44%    ↑       │  │
│  │ New Arrivals    Active      32,102       789   2.46%    ↑       │  │
│  │ Weekend Deal    Paused      21,455       412   1.92%    ↓       │  │
│  │ Mobile Promo    Active      15,744       388   2.46%    ↑       │  │
│  │ Holiday 2026    Draft       10,000       200   2.00%    ─       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. KPI Cards (Top Row)

```jsx
// components/analytics/KPICard.jsx
function KPICard({ title, value, change, changeDirection }) {
  // Shows: title, big number, % change vs previous period
  // Colors: green for up, red for down, gray for neutral
}
```

**KPIs iniciales:**
- Total Impressions
- Total Clicks  
- Average CTR
- (Future: Conversions, Revenue)

### 2. Time Series Chart

```jsx
// components/analytics/TimeSeriesChart.jsx
function TimeSeriesChart({ data, metric, dateRange }) {
  // Line chart with impressions/clicks over time
  // Library: recharts (already in project via template)
}
```

**Ranges:**
- Last 7 days (default)
- Last 30 days
- This month
- Custom range

### 3. Top Campaigns List

```jsx
// components/analytics/TopCampaigns.jsx
function TopCampaigns({ campaigns, metric, limit = 5 }) {
  // Ranked list by selected metric
  // Click to navigate to campaign detail
}
```

### 4. Signal Performance

```jsx
// components/analytics/SignalPerformance.jsx
function SignalPerformance({ signalStats }) {
  // Shows which signals correlate with higher/lower CTR
  // Aggregated across all campaigns
}
```

**Insight tipo:**
> "Ads served when `weather_is_hot=true` have 34% higher CTR than average"

### 5. Campaigns Table

```jsx
// components/analytics/CampaignsTable.jsx
function CampaignsTable({ campaigns, sortBy, sortOrder }) {
  // Sortable table with all campaigns
  // Columns: name, status, impressions, clicks, CTR, trend
}
```

---

## API Endpoints (Backend)

### GET /analytics/overview

Retorna métricas agregadas para el dashboard.

**Request:**
```
GET /analytics/overview?days=7
Authorization: Bearer <token>
```

**Response:**
```json
{
  "period": {
    "start": "2026-01-30",
    "end": "2026-02-06",
    "days": 7
  },
  "totals": {
    "impressions": 124532,
    "clicks": 2891,
    "ctr": 2.32,
    "impressions_change": 12.4,
    "clicks_change": 8.2,
    "ctr_change": -0.3
  },
  "daily": [
    { "date": "2026-01-30", "impressions": 15234, "clicks": 352 },
    { "date": "2026-01-31", "impressions": 18456, "clicks": 428 },
    // ...
  ],
  "top_campaigns": [
    { "id": "...", "name": "Summer Sale", "impressions": 45231, "trend": "up" },
    { "id": "...", "name": "New Arrivals", "impressions": 32102, "trend": "up" },
    // ...
  ],
  "signal_performance": [
    { "signal": "weather_is_hot", "ctr_lift": 34.2 },
    { "signal": "daypart=evening", "ctr_lift": 22.1 },
    // ...
  ]
}
```

### Backend Implementation

```python
# app/api/routes/analytics.py

from fastapi import APIRouter, Depends
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
async def get_analytics_overview(
    days: int = 7,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)
    
    # Current period totals
    current = await db.execute("""
        SELECT 
            COUNT(*) as impressions,
            SUM(CASE WHEN click_timestamp IS NOT NULL THEN 1 ELSE 0 END) as clicks
        FROM impressions
        WHERE user_id = :user_id
        AND timestamp >= :start_date
        AND timestamp <= :end_date
    """, {"user_id": current_user["id"], "start_date": start_date, "end_date": end_date})
    
    # Previous period for comparison
    previous = await db.execute(...)
    
    # Daily breakdown
    daily = await db.execute("""
        SELECT 
            DATE(timestamp) as date,
            COUNT(*) as impressions,
            SUM(CASE WHEN click_timestamp IS NOT NULL THEN 1 ELSE 0 END) as clicks
        FROM impressions
        WHERE user_id = :user_id
        AND timestamp >= :start_date
        GROUP BY DATE(timestamp)
        ORDER BY date
    """)
    
    # Top campaigns
    top_campaigns = await db.execute("""
        SELECT 
            c.id, c.name,
            COUNT(i.id) as impressions
        FROM campaigns c
        LEFT JOIN impressions i ON i.campaign_id = c.id
        WHERE c.user_id = :user_id
        AND i.timestamp >= :start_date
        GROUP BY c.id
        ORDER BY impressions DESC
        LIMIT 5
    """)
    
    # Signal performance (requires more complex analysis)
    signal_performance = await calculate_signal_lift(db, current_user["id"], start_date)
    
    return {
        "period": {...},
        "totals": {...},
        "daily": daily,
        "top_campaigns": top_campaigns,
        "signal_performance": signal_performance
    }
```

### Signal Lift Calculation

```python
async def calculate_signal_lift(db, user_id, start_date):
    """
    Calcula qué señales correlacionan con mejor CTR.
    
    Metodología:
    1. Para cada señal relevante, split impressions en dos grupos:
       - Grupo A: señal = true/valor X
       - Grupo B: señal = false/valor Y
    2. Calcular CTR de cada grupo
    3. Lift = (CTR_A - CTR_B) / CTR_B * 100
    """
    
    signals_to_analyze = [
        ("weather_is_hot", True, False),
        ("weather_is_cold", True, False),
        ("weather_is_rainy", True, False),
        ("daypart", "morning", None),
        ("daypart", "afternoon", None),
        ("daypart", "evening", None),
        ("daypart", "night", None),
        ("daypart_is_weekend", True, False),
    ]
    
    results = []
    
    # Get overall CTR
    overall_ctr = await db.fetchval("""
        SELECT 
            CAST(SUM(CASE WHEN click_timestamp IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT) / 
            NULLIF(COUNT(*), 0) * 100
        FROM impressions
        WHERE user_id = :user_id AND timestamp >= :start_date
    """)
    
    for signal_name, target_value, comparison_value in signals_to_analyze:
        # CTR when signal matches target
        signal_ctr = await db.fetchval(f"""
            SELECT 
                CAST(SUM(CASE WHEN click_timestamp IS NOT NULL THEN 1 ELSE 0 END) AS FLOAT) / 
                NULLIF(COUNT(*), 0) * 100
            FROM impressions
            WHERE user_id = :user_id 
            AND timestamp >= :start_date
            AND signals->>'{signal_name}' = :target_value::text
        """, {"target_value": str(target_value).lower()})
        
        if signal_ctr and overall_ctr:
            lift = (signal_ctr - overall_ctr) / overall_ctr * 100
            results.append({
                "signal": f"{signal_name}={target_value}" if target_value is not True else signal_name,
                "ctr_lift": round(lift, 1),
                "sample_size": ...
            })
    
    # Sort by absolute lift
    results.sort(key=lambda x: abs(x["ctr_lift"]), reverse=True)
    return results[:10]
```

---

## Frontend Implementation

### New Route

```jsx
// App.jsx
<Route path="/analytics" element={<AnalyticsDashboard />} />
```

### Page Component

```jsx
// pages/AnalyticsDashboard.jsx

import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import KPICard from '../components/analytics/KPICard'
import TimeSeriesChart from '../components/analytics/TimeSeriesChart'
import TopCampaigns from '../components/analytics/TopCampaigns'
import SignalPerformance from '../components/analytics/SignalPerformance'
import CampaignsTable from '../components/analytics/CampaignsTable'

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState(7)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const response = await api.get(`/analytics/overview?days=${dateRange}`)
        setData(response.data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [dateRange])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard 
          title="Total Impressions" 
          value={data.totals.impressions}
          change={data.totals.impressions_change}
        />
        <KPICard 
          title="Total Clicks" 
          value={data.totals.clicks}
          change={data.totals.clicks_change}
        />
        <KPICard 
          title="Average CTR" 
          value={`${data.totals.ctr}%`}
          change={data.totals.ctr_change}
        />
      </div>

      {/* Time Series */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Impressions Over Time</h2>
        <TimeSeriesChart data={data.daily} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Campaigns</h2>
          <TopCampaigns campaigns={data.top_campaigns} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Signal Performance</h2>
          <SignalPerformance signals={data.signal_performance} />
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">All Campaigns</h2>
        <CampaignsTable campaigns={data.campaigns} />
      </div>
    </div>
  )
}
```

---

## Database Changes

### New Index for Analytics

```sql
-- Migration: 006_analytics_indexes.sql

-- Index for date-range queries on impressions
CREATE INDEX idx_impressions_timestamp ON impressions (timestamp);

-- Index for user + date combo (most common query pattern)
CREATE INDEX idx_impressions_user_timestamp ON impressions (user_id, timestamp);

-- Index for campaign analytics
CREATE INDEX idx_impressions_campaign_timestamp ON impressions (campaign_id, timestamp);
```

---

## Estimación

| Tarea | Horas |
|-------|-------|
| Backend `/analytics/overview` | 3h |
| Signal lift calculation | 2h |
| KPICard component | 0.5h |
| TimeSeriesChart component | 2h |
| TopCampaigns component | 1h |
| SignalPerformance component | 1h |
| CampaignsTable component | 1h |
| AnalyticsDashboard page | 2h |
| Database indexes | 0.5h |
| Testing | 2h |
| **Total** | **15h** |

---

## Dependencies

```json
{
  "recharts": "^2.x"  // Ya debería estar, si no: npm install recharts
}
```

---

## Future Enhancements

1. **Export to CSV/PDF** — Descargar reportes
2. **Scheduled reports** — Email diario/semanal con métricas
3. **Custom date picker** — Rango de fechas personalizado
4. **Comparison mode** — Comparar período actual vs anterior side-by-side
5. **Campaign goals** — Definir targets y mostrar progreso
6. **Alerts** — Notificar si CTR cae por debajo de threshold
7. **Attribution** — Si hay conversiones, mostrar attribution path

---

## Testing Checklist

- [ ] `/analytics/overview` retorna datos correctos
- [ ] Cambio de date range actualiza datos
- [ ] KPIs muestran cambio % correcto vs período anterior
- [ ] Chart renderiza con datos vacíos sin crash
- [ ] Top campaigns link navega a campaign detail
- [ ] Signal performance ordena por lift absoluto
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Error handling si API falla

---

*Spec creada: 2026-02-06 05:20*
*Estimación: ~15 horas de implementación*
*Prioridad: Media (after deploy)*
