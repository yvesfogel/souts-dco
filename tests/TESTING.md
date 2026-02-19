# 🧪 SOUTS DCO - Testing Guide

**Last Updated:** 2026-02-05  
**Author:** Dico (DCO Agent)

---

## Overview

Esta guía cubre testing E2E del sistema DCO. El objetivo es validar el flujo completo:
`Signup → Create Campaign → Add Variants → Configure Rules → Serve Ads → Track Analytics`

---

## 🚀 Quick Test Checklist

### Pre-requisitos
- [ ] Backend corriendo (`uvicorn app.main:app --reload`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] Supabase configurado con migrations aplicadas
- [ ] Variables de entorno configuradas

### Flujo Básico (5 min)
1. [ ] Crear cuenta nueva
2. [ ] Login exitoso
3. [ ] Crear campaña
4. [ ] Agregar variante con imagen
5. [ ] Preview ad funciona
6. [ ] Ad serving retorna HTML
7. [ ] Click tracking funciona
8. [ ] Analytics muestra impresiones

---

## 📋 Test Cases Detallados

### 1. Authentication

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| AUTH-01 | Signup | Ingresar email/password válidos | Usuario creado, redirect a dashboard |
| AUTH-02 | Signup inválido | Email malformado | Error de validación |
| AUTH-03 | Login | Credenciales correctas | JWT válido, dashboard visible |
| AUTH-04 | Login fallido | Password incorrecto | Error "Invalid credentials" |
| AUTH-05 | Logout | Click logout | Redirect a login, sesión eliminada |
| AUTH-06 | Protected routes | Acceder dashboard sin auth | Redirect a login |

### 2. Campaign CRUD

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| CAMP-01 | Crear campaña | Nombre + descripción | Campaña creada, aparece en lista |
| CAMP-02 | Nombre vacío | Crear sin nombre | Error de validación |
| CAMP-03 | Editar campaña | Cambiar nombre | Nombre actualizado |
| CAMP-04 | Duplicar campaña | Click "Duplicate" | Nueva campaña con "(Copy)" |
| CAMP-05 | Eliminar campaña | Confirmar delete | Campaña removida de lista |
| CAMP-06 | Scheduling | Set start/end dates | Fechas guardadas |

### 3. Variants

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| VAR-01 | Crear variante | Headline + body + CTA + image URL | Variante aparece en lista |
| VAR-02 | Variante default | Crear primera variante | Marcada como default |
| VAR-03 | Cambiar default | Click "Set as default" en otra | Nuevo default asignado |
| VAR-04 | Editar variante | Modificar headline | Cambio guardado |
| VAR-05 | Eliminar variante | Delete variante no-default | Variante eliminada |
| VAR-06 | Weight ajuste | Cambiar peso a 50% | Peso actualizado |

### 4. Rules Engine

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| RULE-01 | Crear regla simple | `weather_is_hot == true` | Regla guardada |
| RULE-02 | Regla con prioridad | Agregar con priority=1 | Alta prioridad ejecuta primero |
| RULE-03 | Múltiples condiciones | `is_hot AND city=="Montevideo"` | AND logic funciona |
| RULE-04 | Editar regla | Cambiar operator | Regla actualizada |
| RULE-05 | Eliminar regla | Delete rule | Regla removida |
| RULE-06 | Rules vs Weights | `ab_test_mode = rules_first` | Reglas evalúan antes de weights |

### 5. Ad Serving

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| AD-01 | Serve HTML | `GET /ad/{id}` | HTML válido con variante |
| AD-02 | Serve JSON | `GET /ad/{id}?format=json` | JSON con signals + variant |
| AD-03 | Debug endpoint | `GET /ad/{id}/debug` | Debug info completo |
| AD-04 | Template override | `?template=hero` | Usa template especificado |
| AD-05 | Simulate signals | `?signal_weather_is_hot=true` | Variante correcta seleccionada |
| AD-06 | Campaign inactiva | End date pasada | No sirve ad (o default) |
| AD-07 | Fallback | Sin reglas match | Default variant servida |
| AD-08 | No variants | Campaña vacía | Error graceful |

### 6. Click Tracking

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| CLICK-01 | Click CTA | Click en botón del ad | Redirect + click registrado |
| CLICK-02 | Click registra variant | Ver en DB | click.variant_id correcto |
| CLICK-03 | Click registra campaign | Ver en DB | click.campaign_id correcto |
| CLICK-04 | CTR calculation | Ver analytics | CTR = clicks/impressions |

### 7. Analytics

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| ANA-01 | Impression count | Servir ad 5 veces | Count = 5 |
| ANA-02 | Daily breakdown | Ver gráfico | Datos por día |
| ANA-03 | Signal breakdown | Ver pie chart | Distribución de signals |
| ANA-04 | Variant performance | Ver tabla | Stats por variante |
| ANA-05 | Date filter | Filtrar por rango | Solo datos del rango |

### 8. Component Pools

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| POOL-01 | Crear pool | Headlines pool con 3 items | Pool creado |
| POOL-02 | Auto-generate | Click generate combinations | Variantes auto-generadas |
| POOL-03 | Pool types | Crear body, image pools | Tipos validados |
| POOL-04 | Eliminar pool | Delete pool | Pool y combinaciones eliminados |

### 9. Asset Management

| ID | Test | Pasos | Expected |
|----|------|-------|----------|
| ASSET-01 | Upload image | Select JPG/PNG | Subido a Supabase Storage |
| ASSET-02 | Asset library | Ver todos los assets | Grid con previews |
| ASSET-03 | Usar en variant | Seleccionar asset | URL copiada a variant |
| ASSET-04 | Delete asset | Eliminar | Removido de storage y DB |

---

## 🔧 Test Scripts

### cURL Commands

```bash
# Variables
BASE_URL="http://localhost:8000"
CAMPAIGN_ID="your-campaign-id"

# Health check
curl $BASE_URL/health

# Get ad HTML
curl $BASE_URL/ad/$CAMPAIGN_ID

# Get ad JSON
curl "$BASE_URL/ad/$CAMPAIGN_ID?format=json"

# Debug signals
curl $BASE_URL/ad/$CAMPAIGN_ID/debug

# Simulate hot weather
curl "$BASE_URL/ad/$CAMPAIGN_ID/simulate?signal_weather_is_hot=true"

# Simulate rainy weekend in Montevideo
curl "$BASE_URL/ad/$CAMPAIGN_ID/simulate?signal_weather_is_rainy=true&signal_daypart_is_weekend=true&signal_geo_city=Montevideo"

# List templates
curl $BASE_URL/ad/templates
```

### Smoke Test Script

```bash
#!/bin/bash
# smoke-test.sh - Quick validation

BASE_URL=${1:-"http://localhost:8000"}

echo "🧪 SOUTS DCO Smoke Test"
echo "========================"

# 1. Health check
echo -n "Health check... "
HEALTH=$(curl -s $BASE_URL/health | jq -r '.status')
[ "$HEALTH" = "ok" ] && echo "✅" || echo "❌ FAIL"

# 2. Templates endpoint
echo -n "Templates list... "
TEMPLATES=$(curl -s $BASE_URL/ad/templates | jq -r '.templates | length')
[ "$TEMPLATES" -gt 0 ] && echo "✅ ($TEMPLATES templates)" || echo "❌ FAIL"

# 3. Auth endpoint exists
echo -n "Auth endpoint... "
AUTH=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/auth/me)
[ "$AUTH" = "401" ] && echo "✅ (protected)" || echo "⚠️ $AUTH"

echo ""
echo "Done. For full tests, use pytest or manual checklist."
```

---

## 🤖 Automated Tests (pytest)

### Setup

```bash
cd backend
pip install pytest pytest-asyncio httpx
```

### Test Structure

```
tests/
├── conftest.py          # Fixtures
├── test_health.py       # Basic health checks
├── test_auth.py         # Auth flow
├── test_campaigns.py    # Campaign CRUD
├── test_ad_serving.py   # Ad serving logic
└── test_analytics.py    # Analytics endpoints
```

### conftest.py

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def test_campaign_id():
    # Return a known test campaign ID or create one
    return "test-campaign-uuid"
```

### test_health.py

```python
import pytest

@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_templates_list(client):
    response = await client.get("/ad/templates")
    assert response.status_code == 200
    data = response.json()
    assert "templates" in data
    assert len(data["templates"]) >= 5  # default, minimal, hero, split, banner
```

### test_ad_serving.py

```python
import pytest

@pytest.mark.asyncio
async def test_ad_serve_html(client, test_campaign_id):
    response = await client.get(f"/ad/{test_campaign_id}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "<html" in response.text or "<!DOCTYPE" in response.text

@pytest.mark.asyncio
async def test_ad_serve_json(client, test_campaign_id):
    response = await client.get(f"/ad/{test_campaign_id}?format=json")
    assert response.status_code == 200
    data = response.json()
    assert "variant" in data
    assert "signals" in data

@pytest.mark.asyncio  
async def test_ad_debug(client, test_campaign_id):
    response = await client.get(f"/ad/{test_campaign_id}/debug")
    assert response.status_code == 200
    data = response.json()
    assert "signals" in data
    assert "geo" in data["signals"]
    assert "weather" in data["signals"]
    assert "daypart" in data["signals"]

@pytest.mark.asyncio
async def test_ad_simulate(client, test_campaign_id):
    response = await client.get(
        f"/ad/{test_campaign_id}/simulate?signal_weather_is_hot=true"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["signals"]["weather"]["is_hot"] == True

@pytest.mark.asyncio
async def test_ad_invalid_campaign(client):
    response = await client.get("/ad/nonexistent-uuid")
    assert response.status_code == 404
```

---

## 🎯 Integration Test Scenario

### "Full Campaign Lifecycle" (manual)

**Setup:** Fresh database, clean state

**Steps:**
1. Create account: `test@example.com`
2. Create campaign: "Summer Sale 2026"
3. Upload asset: summer_banner.jpg
4. Create variant "Hot Day":
   - Headline: "☀️ Beat the Heat!"
   - Body: "Summer sale - 30% off"
   - CTA: "Shop Now"
   - Image: uploaded asset
5. Create variant "Rainy Day":
   - Headline: "🌧️ Cozy Up Inside"
   - Body: "Rainy day deals"
   - CTA: "Browse"
6. Create rule for Hot Day:
   - `weather_is_hot == true`
   - Priority: 1
7. Create rule for Rainy Day:
   - `weather_is_rainy == true`
   - Priority: 2
8. Set Hot Day as default (fallback)
9. Test serving:
   - Simulate hot → should see "Beat the Heat"
   - Simulate rainy → should see "Cozy Up Inside"
   - No signals → should see default (Hot Day)
10. Click CTA in served ad
11. Check analytics:
    - Impressions count
    - Click registered
    - CTR calculated

**Expected Duration:** ~15 minutes

---

## 📊 Performance Benchmarks

| Metric | Target | How to Test |
|--------|--------|-------------|
| Ad serve latency | <100ms | `time curl /ad/{id}` |
| Signal collection | <50ms | Check `/debug` timing |
| Concurrent requests | 100/s | `ab -n 1000 -c 100` |
| Database queries | <5 per serve | Check Supabase logs |

### Quick Performance Test

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test ad serving (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:8000/ad/$CAMPAIGN_ID

# Should see:
# - Requests per second > 100
# - Mean time < 100ms
```

---

## 🐛 Known Issues to Watch

1. **Cache cold start**: First request after restart is slower (geo/weather cache empty)
2. **Rate limits**: ip-api.com has 45 req/min limit for free tier
3. **Timezone**: Daypart signals depend on server timezone vs user timezone

---

## ✅ Sign-off Checklist (Pre-Deploy)

- [ ] All AUTH tests pass
- [ ] All CAMP tests pass  
- [ ] All VAR tests pass
- [ ] All RULE tests pass
- [ ] All AD tests pass
- [ ] All CLICK tests pass
- [ ] All ANA tests pass
- [ ] Performance benchmarks met
- [ ] No console errors in frontend
- [ ] No Python exceptions in backend logs
- [ ] Environment variables documented
- [ ] CORS configured for production domains

---

*Testing guide created by Dico - SOUTS DCO Agent*
