# SETUP.md - Lo que Yves tiene que hacer

## 🚀 Setup Inicial (una sola vez)

### 1. Crear proyecto Supabase
1. Ir a [supabase.com](https://supabase.com) y crear cuenta/proyecto
2. Elegir región cercana (sa-east-1 para latam)
3. Guardar las credenciales que te da

### 2. Configurar Base de Datos
En Supabase Dashboard → SQL Editor, ejecutar EN ORDEN:

```sql
-- 1. Primero el schema inicial
-- Copiar contenido de: supabase/migrations/001_initial.sql

-- 2. Luego A/B Testing
-- Copiar contenido de: supabase/migrations/002_ab_testing.sql

-- 3. Luego Scheduling
-- Copiar contenido de: supabase/migrations/003_scheduling.sql

-- 4. Luego Click Tracking
-- Copiar contenido de: supabase/migrations/004_click_tracking.sql

-- 5. Luego Component Pools
-- Copiar contenido de: supabase/migrations/005_component_pools.sql
```

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

## 📋 Features Implementadas

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
- Simular diferentes condiciones sin tráfico real
- Seleccionar país, clima, temperatura, hora
- Ver qué variante se muestra con esas condiciones
- Preview del ad en iframe
- **Probar**: Panel colapsable arriba de la campaña

### ✅ Analytics Dashboard
- Impresiones totales y por variante
- Gráfico de tendencia diaria
- Breakdown por país, daypart, clima
- Filtro por período (7/14/30 días)
- **Probar**: Panel "Analytics" en la campaña

### ✅ A/B Testing
- Tres modos: Rules+Weights, Pure A/B, Off
- Weights configurables por variante (0-100)
- Distribución visual del tráfico
- **Probar**: Panel "A/B Testing" en sidebar

### ✅ Campaign Scheduling
- Fecha/hora de inicio y fin
- Status indicator: Live, Scheduled, Ended
- Ads no se sirven fuera del schedule
- **Probar**: Panel "Scheduling" en sidebar

### ✅ Multi-Template System
- 5 templates: Default, Minimal, Hero, Split, Banner
- Responsive (adaptan a cualquier tamaño)
- Selección por campaña
- **Probar**: Panel "Template" en sidebar

### ✅ Embed Code Generator
- Tamaños IAB estándar (300x250, 728x90, etc.)
- Tamaño custom
- 3 formatos: iframe, JavaScript, responsive
- Preview en vivo
- Copy to clipboard
- **Probar**: Sección "Embed Code" al final de la campaña

### ✅ Ad Serving
- `GET /ad/{campaign_id}` → HTML personalizado
- `GET /ad/{campaign_id}?format=json` → JSON con signals
- `GET /ad/{campaign_id}?template=hero&width=300` → Template específico
- `GET /ad/{campaign_id}/debug` → Debug info
- `GET /ad/{campaign_id}/simulate?signal_*=*` → Simular signals
- `GET /ad/templates` → Listar templates disponibles
- **Probar**: Copiar "Ad URL" de la campaña y abrir en browser

### ✅ Visual Ad Builder
- Editor drag & drop para crear ads
- Elementos: Text, Image, Button, Shape, Background
- Panel de propiedades para styling
- Múltiples tamaños de canvas (IAB standard)
- Preview y export a JSON
- **Probar**: Click "Ad Builder" en header de campaña

### ✅ Asset Library UI
- Drag & drop upload de imágenes
- Vista grid y lista
- Buscar/filtrar
- Copy URL, eliminar
- Preview de thumbnails
- **Probar**: Sección "Asset Library" en la campaña

### ✅ Click Tracking & CTR
- Tracking automático de clicks en CTAs
- CTR por variante y total
- Analytics muestra: impressions, clicks, CTR
- URLs de tracking transparentes
- **Probar**: Ver sección Analytics después de algunos clicks

### ✅ Duplicate Campaign
- Copiar campaña completa con variantes y rules
- Nueva campaña empieza inactiva
- **Probar**: Botón de copiar en el dashboard

### ✅ Component Pools (Core DCO) ⭐
- Define pools de componentes: headlines, body, CTA, images
- Auto-genera todas las combinaciones posibles
- Ejemplo: 3 headlines × 2 bodies × 2 CTAs = 12 variantes
- Preview antes de generar
- **Probar**: Sección "Component Pools" arriba de Variants

### ✅ Variant Preview Grid
- Ver todas las variantes lado a lado
- Modos: grid y carousel
- Múltiples tamaños de preview
- Click para expandir
- **Probar**: Panel "Variant Preview Grid" debajo de Variants

---

## 🔜 Features para el Futuro

- [ ] Bulk asset upload (drag & drop múltiples)
- [ ] Dashboard overview de todas las campañas
- [ ] Export/Import de campañas
- [ ] API Keys para integración externa
- [ ] Video DCO con Remotion (research en /research/remotion-video-dco.md)
- [ ] AI Creative Generation

---

## 🗄️ Migrations

Si ya tenías la DB creada, correr las nuevas migrations:

```sql
-- 002_ab_testing.sql
ALTER TABLE variants ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 100;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ab_test_mode VARCHAR(20) DEFAULT 'rules';

-- 003_scheduling.sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 004_click_tracking.sql
CREATE TABLE IF NOT EXISTS clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    url TEXT,
    ip_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_id ON clicks(campaign_id);
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service can insert clicks" ON clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own clicks" ON clicks FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = clicks.campaign_id AND campaigns.user_id = auth.uid())
);
```

---

## 🐛 Troubleshooting

### "Invalid API key"
- Verificar que copiaste bien las keys de Supabase
- Verificar que el .env está en la carpeta correcta

### "relation does not exist"
- No corriste la migration SQL
- Ir a SQL Editor y ejecutar las migrations en orden

### "Bucket not found"
- Crear bucket `assets` en Storage
- Verificar que está marcado como Public

### "column does not exist"
- Faltan las nuevas migrations (002, 003)
- Correr los ALTER TABLE del migration correspondiente

### CORS errors
- El backend ya tiene CORS configurado para localhost:5173
- Si usás otro puerto, agregar a `main.py`

### Ad no se muestra
- Verificar que la campaña está "Active"
- Verificar scheduling (start_date/end_date)
- Verificar que hay al menos una variante

---

## 📝 Notas

- Los passwords de usuarios se manejan en Supabase Auth (no en nuestra DB)
- Las API keys de Supabase son seguras de exponer en frontend (anon key tiene RLS)
- El service_key es SECRETO, solo en backend
- Los IPs se hashean para privacidad antes de guardar
- Templates son responsive por defecto, usan CSS clamp()
