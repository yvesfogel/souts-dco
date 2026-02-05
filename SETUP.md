# SETUP.md - Lo que Yves tiene que hacer

## 🚀 Setup Inicial (una sola vez)

### 1. Crear proyecto Supabase
1. Ir a [supabase.com](https://supabase.com) y crear cuenta/proyecto
2. Elegir región cercana (sa-east-1 para latam)
3. Guardar las credenciales que te da

### 2. Configurar Base de Datos
1. En Supabase Dashboard → SQL Editor
2. Copiar contenido de `supabase/migrations/001_initial.sql`
3. Ejecutar (crea tablas, índices, RLS policies)

### 3. Crear Storage Bucket
1. En Supabase Dashboard → Storage
2. Click "New Bucket"
3. Nombre: `assets`
4. Marcar como **Public** ✅
5. Guardar

### 4. Obtener API Keys
En Supabase Dashboard → Settings → API, copiar:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon public key**: `eyJhbGc...` (el largo)
- **service_role key**: `eyJhbGc...` (el otro largo, secreto)

### 5. Configurar Backend
```bash
cd backend
cp ../.env.example .env
```

Editar `.env`:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-key
WEATHER_API_KEY=tu-openweathermap-key  # opcional
```

### 6. Configurar Frontend
```bash
cd frontend
cp .env.example .env
```

Editar `.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 7. (Opcional) API Key de Weather
1. Ir a [openweathermap.org](https://openweathermap.org/api)
2. Crear cuenta gratuita
3. Generar API key
4. Agregar a `.env` del backend

---

## 🏃 Correr el proyecto

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Acceder
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📋 Features implementadas

### ✅ Auth (Supabase Auth)
- Signup/Login con email + password
- Sesiones manejadas automáticamente
- **Probar**: Crear cuenta en http://localhost:5173/login

### ✅ Campaigns CRUD
- Crear, editar, eliminar campañas
- Activar/desactivar
- **Probar**: Click "New Campaign" en dashboard

### ✅ Variants
- Múltiples variantes por campaña
- Campos: headline, body, CTA text/url, imagen
- Marcar variante default
- **Probar**: Dentro de una campaña, "Add Variant"

### ✅ Visual Rules Builder
- Crear reglas sin escribir JSON
- 15+ signals disponibles (geo, weather, daypart)
- Operadores: =, ≠, >, <, contains, in list
- Lógica AND/OR
- Prioridad configurable
- **Probar**: En campaña con variantes, sección "Rules"

### ✅ Signal Simulator
- Simular diferentes condiciones
- Seleccionar país, clima, temperatura, hora
- Ver qué variante se muestra
- Preview del ad en iframe
- **Probar**: Panel colapsable arriba de la campaña

### ✅ Ad Serving
- `GET /ad/{campaign_id}` → HTML personalizado
- `GET /ad/{campaign_id}?format=json` → JSON con signals
- `GET /ad/{campaign_id}/debug` → Debug info
- `GET /ad/{campaign_id}/simulate?signal_*=*` → Simular signals
- **Probar**: Copiar "Ad URL" de la campaña y abrir en browser

### ✅ Asset Upload
- Subir imágenes a Supabase Storage
- Tipos: JPEG, PNG, GIF, WebP
- Máximo 10MB
- **Probar**: (UI pendiente, funciona vía API)

---

## 🔜 Features pendientes de probar

(Se irán agregando aquí a medida que las implemente)

---

## 🐛 Troubleshooting

### "Invalid API key"
- Verificar que copiaste bien las keys de Supabase
- Verificar que el .env está en la carpeta correcta

### "relation does not exist"
- No corriste la migration SQL
- Ir a SQL Editor y ejecutar `001_initial.sql`

### "Bucket not found"
- Crear bucket `assets` en Storage
- Verificar que está marcado como Public

### CORS errors
- El backend ya tiene CORS configurado para localhost:5173
- Si usás otro puerto, agregar a `main.py`

---

## 📝 Notas

- Los passwords de usuarios se manejan en Supabase Auth (no en nuestra DB)
- Las API keys de Supabase son seguras de exponer en frontend (anon key tiene RLS)
- El service_key es SECRETO, solo en backend
