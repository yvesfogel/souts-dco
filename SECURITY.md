# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Features

### Authentication
- **Supabase Auth** — JWT-based authentication
- Protected API routes require valid session
- Frontend route guards for authenticated pages

### API Protection
- **Rate Limiting** — Per-IP limits on all endpoints (slowapi)
  - Ad serving: 100 req/min
  - Debug/simulate: 30 req/min
  - Templates: 60 req/min
- **UUID Validation** — Campaign IDs validated before DB queries
- **CORS** — Configured for specific origins

### Database Security
- **Row Level Security (RLS)** — Users can only access their own data
- **Prepared Statements** — No raw SQL, prevents injection
- **Supabase Policies** — Enforced at database level

### External APIs
- **Circuit Breakers** — Geo/weather APIs fail gracefully
- **Timeouts** — 2s max for external calls
- **No Secrets in Code** — All credentials via environment variables

### Ad Serving
- **HTML Sanitization** — User content escaped in templates
- **CSP Ready** — Templates compatible with Content Security Policy
- **Click Tracking** — Validates campaign exists before redirect

## Environment Variables

Never commit these to version control:

```bash
# Required
SUPABASE_URL=         # Your Supabase project URL
SUPABASE_KEY=         # Supabase anon/public key
SUPABASE_SERVICE_KEY= # Supabase service role key (backend only)

# Optional
ALLOWED_ORIGINS=      # CORS origins (comma-separated)
```

## Known Limitations

1. **IP-based Geo** — Uses client IP for geolocation; may be inaccurate with VPNs
2. **Public Assets** — Uploaded images are publicly accessible
3. **No Audit Log** — Currently no logging of admin actions (planned for multi-tenant)

## Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email: security@souts.ai
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
4. We will respond within 48 hours

## Security Checklist for Deployment

- [ ] Set `SUPABASE_SERVICE_KEY` only in backend environment
- [ ] Enable RLS on all tables
- [ ] Configure CORS to specific domains
- [ ] Use HTTPS in production
- [ ] Set secure cookies for auth
- [ ] Review Supabase dashboard for exposed APIs
- [ ] Enable Supabase database backups

## Best Practices for Operators

1. **Rotate keys** — Change Supabase keys periodically
2. **Monitor rate limits** — Watch for abuse patterns
3. **Review logs** — Check backend logs for anomalies
4. **Update dependencies** — Run `pip audit` and `npm audit` regularly
5. **Backup data** — Enable Supabase point-in-time recovery

---

*Last updated: February 2026*
