# Code Review - souts-dco Backend

**Reviewer:** Dico  
**Date:** 2026-02-05  
**Scope:** Backend services (decisioning, signals, ad serving)

---

## Summary

El backend está **bien estructurado y funcional**. La arquitectura es sólida para un MVP. Identifico algunas mejoras para escalar y producción.

---

## ✅ Lo que está bien

### 1. Arquitectura clara
- Separación de concerns: routes / services / signals
- Cada módulo tiene responsabilidad única
- FastAPI bien configurado con CORS, tags, etc.

### 2. Decisioning engine sólido
- Soporte para múltiples operadores (`eq`, `gt`, `contains`, etc.)
- Lógica AND/OR en rules
- A/B testing con weighted random
- Tres modos claros: `rules`, `weights`, `off`

### 3. Caching implementado
- Geo cache: 1000 entries, TTL configurable
- Weather cache: 500 entries, TTL configurable
- Evita llamadas redundantes a APIs externas

### 4. Background tracking
- Impresiones se trackean en background (no bloquean respuesta)
- IP hasheada para privacidad

### 5. Debugging tools
- `/debug` endpoint para ver signals
- `/simulate` endpoint para testing manual

---

## 🟡 Mejoras sugeridas (Medium Priority)

### 1. Logging estructurado

**Issue:** Solo hay `pass` en exception handlers, sin logging.

**Ubicación:** `ads.py`, `geo.py`, `weather.py`

**Propuesta:**
```python
import logging
logger = logging.getLogger(__name__)

# En lugar de:
except Exception:
    pass

# Usar:
except Exception as e:
    logger.warning(f"Geo lookup failed for {ip}: {e}")
```

**Beneficio:** Debugging en producción, alertas de APIs fallando.

---

### 2. Circuit breaker para APIs externas

**Issue:** Si geo/weather APIs están caídas, cada request hace un intento fallido (2s timeout).

**Propuesta:** Implementar circuit breaker simple:
```python
from datetime import datetime, timedelta

_circuit_open_until = None

async def get_geo_signals(ip: str) -> dict:
    global _circuit_open_until
    
    # Circuit breaker check
    if _circuit_open_until and datetime.now() < _circuit_open_until:
        return _default_geo()
    
    try:
        # ... existing code ...
    except Exception as e:
        # Open circuit for 30 seconds after failure
        _circuit_open_until = datetime.now() + timedelta(seconds=30)
        logger.warning(f"Geo API failed, circuit open: {e}")
        return _default_geo()
```

**Beneficio:** Respuestas rápidas cuando APIs externas fallan.

---

### 3. Métricas de performance

**Issue:** No hay visibilidad de latencia de componentes.

**Propuesta:** Agregar timing a `/debug`:
```python
import time

async def collect_signals(request: Request) -> dict:
    timings = {}
    
    start = time.time()
    geo = await get_geo_signals(ip)
    timings["geo_ms"] = (time.time() - start) * 1000
    
    start = time.time()
    weather = await get_weather_signals(lat, lon)
    timings["weather_ms"] = (time.time() - start) * 1000
    
    signals["_timings"] = timings
    return signals
```

**Beneficio:** Identificar cuellos de botella.

---

### 4. Rate limiting

**Issue:** No hay rate limiting. Un cliente malicioso puede saturar APIs externas.

**Propuesta:** Agregar `slowapi`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/{campaign_id}")
@limiter.limit("100/minute")
async def serve_ad(...):
```

**Beneficio:** Protección contra abuse, control de costos de APIs.

---

### 5. Validación de campaign_id

**Issue:** No se valida que `campaign_id` sea UUID válido antes de query a DB.

**Ubicación:** `ads.py` línea ~85

**Propuesta:**
```python
from uuid import UUID

@router.get("/{campaign_id}")
async def serve_ad(campaign_id: str, ...):
    try:
        UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign ID format")
```

**Beneficio:** Respuestas claras para requests malformados.

---

## 🟢 Mejoras menores (Low Priority)

### 6. Type hints completos
Algunos `dict` returns podrían tener TypedDict o Pydantic models.

### 7. Test coverage
- Tests unitarios para `evaluate_condition` con edge cases
- Tests para weighted_random_choice distribución

### 8. Health check mejorado
Agregar check de DB connection:
```python
@app.get("/health")
async def health():
    try:
        supabase.table("campaigns").select("id").limit(1).execute()
        db_status = "ok"
    except:
        db_status = "error"
    
    return {"status": "ok", "db": db_status, "service": "souts-dco"}
```

---

## 🔴 Issues críticos

**Ninguno encontrado.** El código está listo para MVP.

---

## Priorización

| Mejora | Esfuerzo | Impacto | Prioridad | Status |
|--------|----------|---------|-----------|--------|
| Logging estructurado | Bajo | Alto | P1 | ✅ DONE (2026-02-05) |
| UUID validation | Bajo | Medio | P1 | ✅ DONE (2026-02-05) |
| Circuit breaker | Medio | Alto | P2 | ✅ DONE (2026-02-05) |
| Rate limiting | Medio | Alto | P2 | ✅ DONE (2026-02-05) |
| Métricas | Medio | Medio | P3 | ✅ DONE (2026-02-05 22:20) |
| Health check mejorado | Bajo | Bajo | P3 | ✅ DONE (2026-02-05) |

---

## Implementación Circuit Breaker (2026-02-05)

Agregado a `geo.py` y `weather.py`:
- Threshold: 3 failures antes de abrir circuito
- Timeout: 30 segundos antes de retry (half-open)
- Logging de transiciones de estado
- Respuestas inmediatas cuando el circuito está abierto

---

## Implementación Rate Limiting (2026-02-05)

Agregado `slowapi` con límites por IP:

| Endpoint | Límite | Razón |
|----------|--------|-------|
| `serve_ad` | 100/min | Alto volumen esperado en producción |
| `debug` | 30/min | Solo para testing, más restrictivo |
| `simulate` | 30/min | Solo para testing, más restrictivo |
| `templates` | 60/min | Moderado |

**Archivos modificados:**
- `requirements.txt` - agregado `slowapi==0.1.9`
- `app/core/rate_limit.py` - configuración centralizada (NUEVO)
- `app/main.py` - handler de excepciones
- `app/api/routes/ads.py` - decoradores en endpoints

**Response cuando se excede:**
```json
HTTP 429 Too Many Requests
{"error": "Rate limit exceeded: 100 per 1 minute"}
```

---

## Next Steps

1. ~~**Inmediato:** Agregar logging y UUID validation~~ ✅
2. ~~**Esta semana:** Circuit breaker para geo/weather~~ ✅
3. ~~**Pre-deploy:** Rate limiting con slowapi~~ ✅
4. **Post-launch:** Métricas y monitoring, health check mejorado

---

---

## Implementación Health Check Mejorado (2026-02-05)

Actualizado `/health` endpoint con:
- **DB connectivity check:** Verifica conexión a Supabase
- **Latencia:** Mide tiempo de query a DB en ms
- **Timestamp:** ISO timestamp UTC
- **Estado degradado:** Reporta `degraded` si DB falla

**Response ejemplo:**
```json
{
  "status": "ok",
  "service": "souts-dco",
  "version": "0.1.0",
  "timestamp": "2026-02-05T21:45:00.000Z",
  "components": {
    "database": {
      "status": "ok",
      "latency_ms": 45.2
    }
  }
}
```

**Beneficio:** Monitoring en producción puede alertar sobre DB issues.

---

---

## Implementación Performance Metrics (2026-02-05 22:20)

Agregado timing metrics al `/debug` endpoint:

**Cambios en `collect_signals()`:**
- Nuevo parámetro `include_timings: bool = False`
- Captura latencia de cada paso: geo, weather, daypart
- Retorna `_timings` dict con métricas en ms

**Response ejemplo de `/debug`:**
```json
{
  "signals": {
    "geo_country": "Uruguay",
    "weather_temp": 25,
    "daypart": "night",
    "_timings": {
      "geo_ms": 45.2,
      "weather_ms": 120.5,
      "daypart_ms": 0.1,
      "decisioning_ms": 12.3,
      "total_ms": 178.1
    }
  },
  "selected_variant": {...}
}
```

**Beneficio:** Visibilidad completa de latencia por componente para debugging y optimización.

---

## 🎯 Code Review Status: ALL COMPLETE ✅

Todas las mejoras identificadas (P1, P2, P3) han sido implementadas:
- ✅ Logging estructurado
- ✅ UUID validation  
- ✅ Circuit breakers
- ✅ Rate limiting
- ✅ Health check mejorado
- ✅ Performance metrics

**El backend está listo para producción.**

---

*Reviewed by Dico 🎬 - DCO Lead*
