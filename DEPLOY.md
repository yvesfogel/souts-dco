# DEPLOY.md - Guía de Deploy

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Heroku      │────▶│    Supabase     │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
│   React/Vite    │     │   FastAPI       │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Pre-requisitos

1. Cuenta en [Supabase](https://supabase.com) (ya configurada)
2. Cuenta en [Heroku](https://heroku.com)
3. Cuenta en [Vercel](https://vercel.com)
4. [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) instalado
5. [Vercel CLI](https://vercel.com/cli) instalado (opcional)

---

## Paso 1: Deploy Backend en Heroku

### 1.1 Login en Heroku
```bash
heroku login
```

### 1.2 Crear app en Heroku
```bash
# Desde la raíz del proyecto
heroku create souts-dco-api
# O con nombre custom: heroku create tu-nombre-app
```

### 1.3 Configurar variables de entorno
```bash
heroku config:set SUPABASE_URL=https://xxx.supabase.co
heroku config:set SUPABASE_ANON_KEY=eyJhbGc...
heroku config:set SUPABASE_SERVICE_KEY=eyJhbGc...
heroku config:set WEATHER_API_KEY=tu-key-opcional
heroku config:set FRONTEND_URL=https://tu-app.vercel.app
```

### 1.4 Deploy
```bash
# Desde la raíz del proyecto (el Procfile ya está configurado)
git push heroku main
```

### 1.5 Verificar
```bash
heroku open
# Debería abrir https://souts-dco-api.herokuapp.com/health
# Respuesta esperada: {"status": "ok", "service": "souts-dco"}
```

### 1.6 Ver logs si hay problemas
```bash
heroku logs --tail
```

---

## Paso 2: Deploy Frontend en Vercel

### 2.1 Opción A: Desde GitHub (recomendado)

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa el repo `yvesfogel/souts-dco`
3. Configura:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Agrega Environment Variables:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
   - `VITE_API_URL` = https://souts-dco-api.herokuapp.com (sin /api al final)
5. Click "Deploy"

### 2.2 Opción B: Desde CLI

```bash
cd frontend
npm install -g vercel
vercel login
vercel
# Seguir las instrucciones
# Cuando pregunte por env vars, agregar las 3 de arriba
```

### 2.3 Configurar dominio custom (opcional)
En Vercel Dashboard → Settings → Domains

---

## Paso 3: Conectar Backend ↔ Frontend

### 3.1 Actualizar CORS en Heroku
Una vez que tengas la URL de Vercel:
```bash
heroku config:set FRONTEND_URL=https://souts-dco.vercel.app
```

### 3.2 Verificar conexión
1. Abre tu app en Vercel
2. Intenta hacer login
3. Crea una campaña de prueba

---

## Troubleshooting

### "Application Error" en Heroku
```bash
heroku logs --tail
# Buscar el error específico
```

Errores comunes:
- **ModuleNotFoundError**: Falta dependencia en requirements.txt
- **Invalid API key**: Variables de entorno mal configuradas
- **Port binding**: El Procfile debe usar `$PORT`

### "Failed to fetch" en Frontend
- Verificar que `VITE_API_URL` apunta al Heroku correcto
- Verificar CORS: el backend debe permitir el dominio de Vercel
- Abrir DevTools → Network para ver el error exacto

### Supabase "relation does not exist"
- No corriste todas las migrations
- Ve a Supabase SQL Editor y corre los 9 archivos en orden (001-009)

---

## Variables de Entorno - Resumen

### Backend (Heroku)
| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | https://xxx.supabase.co |
| `SUPABASE_ANON_KEY` | eyJhbGc... |
| `SUPABASE_SERVICE_KEY` | eyJhbGc... (secreto) |
| `WEATHER_API_KEY` | (opcional) |
| `FRONTEND_URL` | https://tu-app.vercel.app |

### Frontend (Vercel)
| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | https://xxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | eyJhbGc... |
| `VITE_API_URL` | https://tu-heroku.herokuapp.com |

---

## Costos Estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free | $0 (500MB DB, 1GB storage) |
| Heroku | Eco Dynos | ~$5/mes |
| Vercel | Hobby | $0 |
| **Total** | | **~$5/mes** |

Para escalar:
- Supabase Pro: $25/mes
- Heroku Standard: $25/mes
- Vercel Pro: $20/mes

---

## Deploy Automático (CI/CD)

### GitHub Actions (opcional)
El repo ya está conectado. Para auto-deploy:

1. **Heroku**: Settings → Connect to GitHub → Enable auto-deploy
2. **Vercel**: Ya hace auto-deploy en cada push a main

---

## Comandos Útiles

```bash
# Ver status de Heroku
heroku ps

# Reiniciar Heroku
heroku restart

# Ver variables configuradas
heroku config

# Abrir app
heroku open

# Logs en tiempo real
heroku logs --tail

# Vercel logs
vercel logs tu-proyecto.vercel.app
```

---

## Checklist de Deploy

- [ ] Supabase configurado con las 9 migrations (001-009)
- [ ] Bucket "assets" creado y público
- [ ] Heroku app creada
- [ ] Variables de entorno en Heroku configuradas
- [ ] Backend deployado y respondiendo en /health
- [ ] Vercel app creada
- [ ] Variables de entorno en Vercel configuradas
- [ ] Frontend deployado
- [ ] CORS funcionando (login works)
- [ ] Test: crear campaña, variantes, rules
- [ ] Test: ad serving funciona (visitar /ad/{campaign_id})
