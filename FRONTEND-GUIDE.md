# 🎨 SOUTS DCO - Frontend Developer Guide

**Stack:** React 18 + Vite + TailwindCSS + Supabase Auth  
**Última actualización:** 2026-02-05

---

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── App.jsx              # Router principal + auth state
│   ├── main.jsx             # Entry point
│   ├── index.css            # Tailwind imports
│   │
│   ├── lib/
│   │   ├── api.js           # Cliente HTTP con auth
│   │   └── supabase.js      # Cliente Supabase
│   │
│   ├── pages/
│   │   ├── Login.jsx        # Auth page
│   │   ├── Dashboard.jsx    # Lista de campañas
│   │   ├── CampaignDetail.jsx  # Editor principal
│   │   └── AdBuilderPage.jsx   # Visual ad builder
│   │
│   └── components/
│       ├── ABTestConfig.jsx    # Configuración A/B testing
│       ├── Analytics.jsx       # Gráficos de performance
│       ├── AssetLibrary.jsx    # Upload/gestión de assets
│       ├── ComponentPools.jsx  # Pools de componentes
│       ├── EmbedCode.jsx       # Generador de embed codes
│       ├── RulesBuilder.jsx    # Builder visual de reglas
│       ├── Scheduling.jsx      # Date picker start/end
│       ├── SignalSimulator.jsx # Preview con signals custom
│       ├── TemplateSelector.jsx # Selector de templates
│       ├── VariantGrid.jsx     # Grid de variantes
│       └── AdBuilder/          # Componentes del visual builder
│
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 🔐 Autenticación

### Flujo
1. `App.jsx` chequea sesión al montar con `supabase.auth.getSession()`
2. Listener `onAuthStateChange` mantiene estado sincronizado
3. Rutas protegidas redirigen a `/login` si no hay sesión
4. `lib/api.js` inyecta token en cada request

### Código clave
```jsx
// App.jsx - Auth check
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
    setLoading(false)
  })
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => setSession(session)
  )
  
  return () => subscription.unsubscribe()
}, [])
```

---

## 🌐 API Client (`lib/api.js`)

### Patrón
Todas las llamadas pasan por `fetchWithAuth()` que:
1. Obtiene sesión actual de Supabase
2. Agrega header `Authorization: Bearer <token>`
3. Maneja errores y parsea JSON

### Endpoints disponibles
```javascript
api.getCampaigns()
api.getCampaign(id)
api.createCampaign(data)
api.updateCampaign(id, data)
api.deleteCampaign(id)
api.duplicateCampaign(id)

api.createVariant(campaignId, data)
api.updateVariant(campaignId, variantId, data)
api.deleteVariant(campaignId, variantId)

api.createRule(campaignId, data)
api.updateRule(campaignId, ruleId, data)
api.deleteRule(campaignId, ruleId)

api.getAssets(campaignId)
api.deleteAsset(assetId)
api.uploadAsset(campaignId, name, file)  // FormData
```

### Configuración de URL
```javascript
const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'  // Usa proxy en dev
```

---

## 📄 Pages

### Login (`pages/Login.jsx`)
- Formulario email/password
- Toggle login/signup
- Usa `supabase.auth.signInWithPassword()` o `signUp()`

### Dashboard (`pages/Dashboard.jsx`)
- Lista todas las campañas del usuario
- CRUD: crear, eliminar, duplicar
- Link a cada campaña → `/campaigns/:id`
- Props: `session`

### CampaignDetail (`pages/CampaignDetail.jsx`)
- **Editor principal** de una campaña
- Tabs/secciones para:
  - Variantes (VariantGrid)
  - Reglas (RulesBuilder)
  - Assets (AssetLibrary)
  - A/B Testing (ABTestConfig)
  - Scheduling (Scheduling)
  - Component Pools (ComponentPools)
  - Embed Code (EmbedCode)
  - Analytics (Analytics)
  - Preview (SignalSimulator)
- Props: `session`

### AdBuilderPage (`pages/AdBuilderPage.jsx`)
- Visual drag-and-drop ad builder
- Usa componentes de `components/AdBuilder/`
- Rutas:
  - `/campaigns/:id/builder` - nuevo ad
  - `/campaigns/:id/variants/:variantId/builder` - editar variante

---

## 🧩 Components

### VariantGrid
Grid de cards mostrando cada variante. Permite:
- Ver preview de cada variante
- Editar (abre AdBuilder)
- Eliminar
- Ver/editar weight (A/B)

### RulesBuilder
Constructor visual de reglas condicionales:
- Selector de signal (geo_country, weather_is_hot, etc.)
- Operadores (equals, contains, gt, lt, etc.)
- Valor a comparar
- Variante target
- Prioridad

### SignalSimulator
Preview del ad con signals personalizados:
- Inputs para simular geo, weather, time
- Muestra qué variante se seleccionaría
- Útil para debugging de reglas

### AssetLibrary
Gestión de assets (imágenes, etc.):
- Upload con drag & drop
- Vista grid/list
- Delete
- Copy URL

### ComponentPools
Pools de componentes para auto-generación:
- Crear pools (headlines, images, CTAs)
- El backend genera combinaciones automáticamente

### ABTestConfig
Configuración del modo A/B:
- `off` - usa reglas únicamente
- `weighted` - distribución por peso
- `rules_then_weighted` - reglas primero, luego peso como fallback

### Scheduling
Date pickers para:
- `start_date` - cuándo activa la campaña
- `end_date` - cuándo expira

### EmbedCode
Genera código para incrustar:
- iframe básico
- JavaScript embed
- Responsive wrapper
- Copy to clipboard

### Analytics
Gráficos de performance:
- Impressions over time
- Clicks over time
- CTR
- Breakdown por variante

### TemplateSelector
Selector visual de templates:
- default, minimal, hero, split, banner
- Preview de cada template

---

## 🎨 Styling

### Tailwind CSS
- Config en `tailwind.config.js`
- Colores: usa `indigo` como primario
- Espaciado: `p-4`, `m-2`, `space-y-4`
- Responsive: `sm:`, `md:`, `lg:`

### Patrones comunes
```jsx
// Card
<div className="bg-white rounded-lg shadow p-6">

// Button primario
<button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">

// Input
<input className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500">

// Loading spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600">
```

### Iconos
Usa `lucide-react`:
```jsx
import { Plus, Trash2, Settings, Eye, Copy } from 'lucide-react'
```

---

## 🔧 Development

### Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Editar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

### Proxy en desarrollo
`vite.config.js` proxea `/api` al backend:
```javascript
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

### Build
```bash
npm run build
# Output en dist/
```

---

## 🚀 Agregar nueva feature

### 1. Nuevo endpoint en API
```javascript
// lib/api.js
api.myNewMethod: (data) => fetchWithAuth('/my-endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
}),
```

### 2. Nuevo componente
```jsx
// components/MyComponent.jsx
import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function MyComponent({ campaignId }) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    api.myNewMethod({ campaignId }).then(setData)
  }, [campaignId])
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* ... */}
    </div>
  )
}
```

### 3. Nueva página
```jsx
// pages/MyPage.jsx
export default function MyPage({ session }) { ... }

// App.jsx - agregar ruta
<Route 
  path="/my-path" 
  element={session ? <MyPage session={session} /> : <Navigate to="/login" />} 
/>
```

---

## 🐛 Debugging

### Errores de API
Todos los errores pasan por `fetchWithAuth`:
```javascript
if (!response.ok) {
  const error = await response.json()
  throw new Error(error.detail || 'Request failed')
}
```

### Auth issues
1. Check DevTools → Application → Local Storage → `sb-*` keys
2. `supabase.auth.getSession()` en consola
3. Verificar que el backend acepta el token

### Preview de ads
Usar SignalSimulator con diferentes combinaciones de signals para verificar que las reglas funcionan correctamente.

---

## 📝 TODOs / Mejoras sugeridas

1. **Tests** - Agregar Vitest + React Testing Library
2. **State management** - Considerar Zustand si crece la complejidad
3. **Error boundaries** - Agregar React error boundaries
4. **Loading states** - Más consistentes con skeletons
5. **Dark mode** - Tailwind lo soporta fácil
6. **i18n** - Si se necesita multi-idioma

---

*Documentación creada por Dico - SOUTS DCO Agent*
