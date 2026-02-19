# Frontend Code Review - souts-dco

**Fecha:** 2026-02-05  
**Reviewer:** Dico 🎬  
**Status:** Análisis completo, mejoras recomendadas

---

## Executive Summary

El frontend está bien estructurado con React + Vite + Tailwind. La arquitectura es clara y el código es legible. Sin embargo, hay oportunidades de mejora en error handling, UX, y robustez.

| Categoría | Score | Notas |
|-----------|-------|-------|
| Arquitectura | ✅ 8/10 | Clara separación de concerns |
| Error Handling | 🟡 5/10 | Usa `alert()`, falta retry logic |
| UX | 🟡 6/10 | Falta feedback en operaciones |
| Code Quality | 🟡 7/10 | Bug encontrado, falta debounce |
| Performance | ✅ 8/10 | Ok para MVP |

---

## 🔴 Crítico — Bugs que requieren fix

### 1. Duplicate Import en CampaignDetail.jsx

**Archivo:** `src/pages/CampaignDetail.jsx`

```jsx
// Líneas 2 y 4 - DUPLICADO
import { useParams, Link } from 'react-router-dom'  // Línea 2
import { Link } from 'react-router-dom'              // Línea 4 - ERROR
```

**Fix:** Eliminar línea 4.

### 2. No hay validación de session en API calls

**Archivo:** `src/lib/api.js`

```javascript
// Si session es null, el header Authorization estará vacío
// Pero el request se envía igual
if (session) {
  headers['Authorization'] = `Bearer ${session.access_token}`
}
```

**Fix:** Throw error si no hay session para endpoints protegidos.

---

## 🟡 Medium — Mejoras recomendadas

### 1. Usar toast notifications en vez de alert()

**Problema:** `alert()` bloquea la UI y es poco profesional.

**Ubicaciones:**
- `CampaignDetail.jsx`: líneas múltiples
- `RulesBuilder.jsx`: línea 117

**Recomendación:** Instalar `react-hot-toast` o `sonner`.

```jsx
// Antes
alert(err.message)

// Después
import { toast } from 'react-hot-toast'
toast.error(err.message)
```

### 2. Agregar loading states a operaciones CRUD

**Problema:** No hay feedback visual durante saves/deletes.

**Ejemplo en CampaignDetail.jsx:**
```jsx
const handleDeleteVariant = async (variantId) => {
  if (!confirm('Delete this variant?')) return
  // ⚠️ No hay loading state
  try {
    await api.deleteVariant(id, variantId)
    loadCampaign()
  } catch (err) {
    alert(err.message)
  }
}
```

**Fix:** Agregar `[deletingId, setDeletingId]` state y mostrar spinner.

### 3. Agregar timeout y retry en API client

**Archivo:** `src/lib/api.js`

```javascript
// Agregar timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)

const response = await fetch(`${API_URL}${url}`, {
  ...options,
  headers,
  signal: controller.signal,
})

clearTimeout(timeoutId)
```

### 4. Debounce en inputs onBlur

**Problema:** Múltiples API calls si el usuario edita rápido.

**Archivo:** `CampaignDetail.jsx`, sección de variant editing.

```jsx
// Antes
onBlur={(e) => handleUpdateVariant(variant.id, { headline: e.target.value })}

// Después - usar useDebounce o lodash.debounce
```

### 5. Error boundary para crashes

**Falta:** Un `ErrorBoundary` component a nivel de App.

```jsx
// src/components/ErrorBoundary.jsx
import { Component } from 'react'

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

---

## 🟢 Nice to Have

### 1. Keyboard shortcuts en AdBuilder

- `Delete` → eliminar elemento
- `Cmd/Ctrl + D` → duplicar
- `Cmd/Ctrl + Z` → undo (ya hay history, falta binding)
- `Cmd/Ctrl + S` → save

### 2. Optimistic updates

Actualizar UI inmediatamente y revertir si el API falla.

### 3. Skeleton loading states

En vez de spinner genérico, mostrar skeletons de contenido.

### 4. Confirmación antes de salir con cambios no guardados

```jsx
useEffect(() => {
  const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [hasUnsavedChanges])
```

---

## Archivos a modificar (prioridad)

| Prioridad | Archivo | Cambio |
|-----------|---------|--------|
| P0 | `CampaignDetail.jsx` | Fix duplicate import |
| P1 | `lib/api.js` | Timeout + session validation |
| P1 | Nuevo: `components/ErrorBoundary.jsx` | Crash handling |
| P1 | `package.json` | Agregar `react-hot-toast` |
| P2 | `CampaignDetail.jsx` | Loading states, toasts |
| P2 | `RulesBuilder.jsx` | Toast en vez de alert |
| P3 | `AdBuilder/index.jsx` | Keyboard shortcuts |

---

## Testing Recommendations

### Unit Tests Faltantes

1. `api.js` - mock fetch, test error handling
2. `RulesBuilder.jsx` - test condition creation/editing
3. `AdBuilder` - test element CRUD

### E2E Tests

Usando Playwright:
1. Login flow
2. Create campaign → add variant → add rule → preview
3. AdBuilder: add elements, save template

---

## Performance Notes

### ✅ Lo bueno
- Vite para fast HMR
- Tailwind purge en build
- No hay re-renders innecesarios obvios

### 🟡 Oportunidades
- React.memo en componentes de lista (VariantGrid items)
- useMemo para computed values
- Code splitting con React.lazy para AdBuilder (es grande)

```jsx
// App.jsx - lazy load AdBuilder
const AdBuilderPage = React.lazy(() => import('./pages/AdBuilderPage'))

// En Routes
<Route 
  path="/campaigns/:id/builder" 
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <AdBuilderPage />
    </Suspense>
  } 
/>
```

---

## Next Steps

1. **Inmediato:** Fix duplicate import bug
2. **Esta semana:** Toast notifications + error boundary
3. **Próxima semana:** Loading states + keyboard shortcuts

---

*Review completado por Dico 🎬 — 2026-02-05 22:30*
