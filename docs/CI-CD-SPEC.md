# CI/CD Pipeline Specification

## Overview

Automated testing and deployment pipeline for SOUTS DCO using GitHub Actions.

**Goals:**
- Run tests on every PR
- Type-check and lint
- Deploy to staging on `develop` branch
- Deploy to production on `main` branch (manual approval)

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PR/Push ──► Lint ──► Test ──► Build ──► [Deploy]              │
│                                                                 │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────┐ │
│  │ Ruff    │   │ pytest  │   │ Docker  │   │ Railway/Heroku  │ │
│  │ ESLint  │   │ Vitest  │   │ Build   │   │ Vercel          │ │
│  └─────────┘   └─────────┘   └─────────┘   └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflows

### 1. PR Validation (`pr-check.yml`)

Triggered on every pull request.

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install backend deps
        run: |
          cd backend
          pip install -r requirements.txt
          pip install ruff
          
      - name: Lint Python (ruff)
        run: |
          cd backend
          ruff check .
          
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install frontend deps
        run: |
          cd frontend
          npm ci
          
      - name: Lint TypeScript/JS (ESLint)
        run: |
          cd frontend
          npm run lint

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install deps
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx
          
      - name: Run tests
        run: |
          cd backend
          pytest ../tests/ -v
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install deps
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm test -- --run
          
      - name: Build check
        run: |
          cd frontend
          npm run build
```

### 2. Deploy Staging (`deploy-staging.yml`)

Triggered on push to `develop`.

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Option A: Railway
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: dco-backend-staging
          
      # Option B: Heroku
      # - uses: akhileshns/heroku-deploy@v3.12.14
      #   with:
      #     heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
      #     heroku_app_name: souts-dco-staging
      #     heroku_email: ${{ secrets.HEROKU_EMAIL }}
      #     appdir: backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
          # No production flag = staging/preview
```

### 3. Deploy Production (`deploy-production.yml`)

Triggered on push to `main` with manual approval.

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    uses: ./.github/workflows/pr-check.yml
    secrets: inherit

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway (Production)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: dco-backend-prod

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: frontend
          vercel-args: '--prod'  # Production flag
```

---

## Required Secrets

Configure these in GitHub Repository Settings → Secrets:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | Tests |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Tests |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | Tests (optional) |
| `RAILWAY_TOKEN` | Railway deploy token | Backend deploy |
| `VERCEL_TOKEN` | Vercel deploy token | Frontend deploy |
| `VERCEL_ORG_ID` | Vercel organization ID | Frontend deploy |
| `VERCEL_PROJECT_ID` | Vercel project ID | Frontend deploy |

---

## Environment Protection

Configure in GitHub Settings → Environments:

### `staging`
- No protection rules
- Auto-deploy on `develop`

### `production`
- Require approval (1 reviewer)
- Only deploy on `main`
- Optional: Wait timer (e.g., 5 min delay)

---

## Pre-commit Hooks (Optional)

For local development:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.2.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
        
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.56.0
    hooks:
      - id: eslint
        files: \.[jt]sx?$
        additional_dependencies:
          - eslint
          - eslint-config-react-app
EOF

# Install hooks
pre-commit install
```

---

## Ruff Configuration

Add to `backend/pyproject.toml`:

```toml
[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "UP",   # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[tool.ruff.lint.isort]
known-first-party = ["app"]
```

---

## ESLint Configuration

Add to `frontend/.eslintrc.cjs`:

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
```

---

## Branch Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/xxx (feature branches)
```

1. Create feature branch from `develop`
2. PR to `develop` → triggers tests
3. Merge to `develop` → auto-deploy staging
4. PR `develop` → `main` → tests + manual approval → production

---

## Monitoring Post-Deploy

After deployment, verify:

1. **Health check**: `GET /health` returns 200
2. **Ad serving**: `GET /ad/{campaign_id}` works
3. **Auth**: Login flow functional
4. **Signals**: Geo/weather returning data

Automated health check in workflow:

```yaml
- name: Health check
  run: |
    sleep 30  # Wait for deploy
    curl -f https://your-api.railway.app/health || exit 1
```

---

## Cost Estimates

| Service | Tier | Cost/Month |
|---------|------|------------|
| Railway | Starter | ~$5 |
| Vercel | Hobby | Free |
| GitHub Actions | Free tier | Free (2000 min/mo) |
| **Total** | | **~$5/mo** |

---

## Next Steps

1. [ ] Create GitHub repo (if not exists)
2. [ ] Add secrets to repo settings
3. [ ] Create `develop` branch
4. [ ] Create environment protection rules
5. [ ] Add workflow files
6. [ ] Test PR workflow
7. [ ] Configure Vercel project
8. [ ] First deploy to staging

---

*Created: 2026-02-06 04:20*
*Author: Dico (DCO Agent)*
