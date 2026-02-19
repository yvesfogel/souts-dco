# Decisioning Engine — Notes & Next Improvements

**Fecha:** 2026-02-05

## 1) Flujo actual (backend/app/services/decisioning.py)

1. **Recibe** `campaign_id` + `signals`.
2. **Lee** `ab_test_mode` de `campaigns`.
3. **Carga** variantes de la campaña.
4. **Selección por modo**:
   - **off** → devuelve default (o primera variante).
   - **weights** → `weighted_random_choice()`.
   - **rules** → evalúa reglas activas por prioridad, y si ninguna matchea:
     - default si existe, si no weighted.

## 2) Reglas y evaluación

- Cada regla puede tener **N condiciones** con `logic` AND/OR.
- Operadores soportados:
  - `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `contains`.
- Si una condición no tiene signal → **False**.
- Si una regla no tiene condiciones → **True** (match por defecto).

## 3) Comportamiento de A/B

- `weights` usa `random.uniform` → no determinístico por usuario.
- En `rules`, la prioridad manda (primera regla true gana).
- Si no hay default, se usa weighted en fallback.

## 4) Edge Cases actuales

- **Peso 0**: variantes con weight=0 se filtran; si todas quedan en 0 → fallback a primera.
- **Campos faltantes**: condiciones con signals ausentes → false.
- **Rules sin variant**: si una regla no tiene `variant` asociado, devuelve `None` (potencial bug).

## 5) Mejoras rápidas (1–3 horas)

### 🔧 Seguridad / robustez
- **Validar reglas malformadas**: si rule.variant es None → seguir evaluando o fallback.
- **Tipado fuerte** en `value` según tipo de signal (float/int/string/array).

### 🎯 Mejor decisión
- **Sticky bucketing**: usar hash(campaign_id + user_id/ip) para AB determinístico.
- **Rule tie-break**: si dos reglas tienen misma prioridad, resolver por weight o created_at.

### ⚡ Performance
- **Batch fetch**: traer rules + variants en 1 query si Supabase lo permite.
- **Cache short-lived** en memory por campaign_id para traffic alto.

## 6) Mejora media (1–2 días)

- **Segmentos de audiencia**: reglas que apunten a segmentos pre-calculados (CDP).
- **Multi-objective**: fallback basado en performance (CTR) en lugar de peso fijo.
- **Experimentación avanzada**: bandits (Thompson sampling) como modo extra.

## 7) Tests sugeridos

1. `ab_test_mode=off` → siempre default
2. `weights` con weights [70,30] → ~70/30 en 1k requests
3. `rules` con condition match → retorna variant correcta
4. `rules` sin match → fallback a default
5. `rules` sin default → fallback weighted

---

**Notas finales:**
Este engine es sólido para MVP. Con **sticky bucketing** + validación de reglas malformadas ya quedaría listo para tráfico real y análisis de performance consistente.
