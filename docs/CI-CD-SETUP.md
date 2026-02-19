# CI/CD Setup Guide

Quick setup guide for the GitHub Actions pipelines.

## Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| `pr-check.yml` | Pull request | Lint + Test |
| `deploy-staging.yml` | Push to `develop` | Deploy to staging |
| `deploy-production.yml` | Push to `main` | Deploy to production (manual approval) |

## Setup Steps

### 1. Create GitHub Secrets

Go to repo **Settings → Secrets → Actions** and add:

**Required for tests:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Required for deploy (choose one platform):**

**Railway:**
- `RAILWAY_TOKEN`

**Fly.io:**
- `FLY_API_TOKEN`

**Render:**
- `RENDER_DEPLOY_HOOK_URL`
- `RENDER_DEPLOY_HOOK_URL_PROD`

**Vercel (frontend):**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 2. Create GitHub Variables

Go to repo **Settings → Variables → Actions** and add:

- `DEPLOY_PLATFORM`: `railway` | `fly` | `render`
- `STAGING_API_URL`: e.g., `https://dco-staging.railway.app`
- `PROD_API_URL`: e.g., `https://dco.railway.app`

### 3. Create Environments

Go to repo **Settings → Environments** and create:

**staging:**
- No protection rules
- Auto-deploy

**production:**
- Required reviewers: 1+
- Optional: Wait timer (5 min)

### 4. Create `develop` Branch

```bash
git checkout -b develop
git push -u origin develop
```

### 5. Test the Pipeline

1. Create a feature branch
2. Make a small change
3. Open PR to `develop`
4. Verify PR checks pass
5. Merge → staging deploys
6. PR `develop` → `main`
7. Approve production deploy

## Local Development

### Pre-commit Hooks (Optional)

```bash
pip install pre-commit
pre-commit install
```

### Manual Lint

```bash
# Backend
cd backend && ruff check .

# Frontend
cd frontend && npm run lint
```

## Troubleshooting

### Tests fail with missing secrets
Make sure all required secrets are added in GitHub settings.

### Deploy fails with "service not found"
Create the service in Railway/Fly.io/Render first, then deploy.

### Vercel deploy fails
Run `vercel link` locally first to get org/project IDs.

---

See [CI-CD-SPEC.md](CI-CD-SPEC.md) for full specification.
