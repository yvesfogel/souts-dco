# DCO Platform Testing Guide

## Overview

This directory contains the test suite for the DCO Platform backend.

## Test Structure

```
tests/
├── __init__.py
├── conftest.py           # Shared fixtures and configuration
├── TESTING.md            # This file
├── test_campaigns.py     # Campaign CRUD tests
├── test_assets.py        # Asset management + bulk operations
├── test_analytics.py     # Analytics dashboard tests
├── test_api_keys.py      # API key management tests
├── test_orgs.py          # Multi-tenant organization tests
└── test_ai_generation.py # AI creative generation tests
```

## Running Tests

### Prerequisites

```bash
cd backend
source venv/bin/activate  # or activate your virtual environment
pip install pytest pytest-asyncio pytest-cov httpx
```

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

### Run Specific Test File

```bash
pytest tests/test_campaigns.py
```

### Run Specific Test Class

```bash
pytest tests/test_campaigns.py::TestCampaignCreate
```

### Run Specific Test

```bash
pytest tests/test_campaigns.py::TestCampaignCreate::test_create_campaign_success
```

### Run with Verbose Output

```bash
pytest -v
```

### Run Only Failed Tests

```bash
pytest --lf
```

## Test Categories

### Unit Tests (Current)

These tests mock external dependencies (Supabase) and test business logic in isolation:

- **Campaigns**: CRUD operations, signal validation, permissions
- **Assets**: Upload, bulk operations, folder/tag management
- **Analytics**: CTR calculation, date ranges, aggregations
- **API Keys**: Generation, scopes, expiration, rate limiting
- **Organizations**: CRUD, roles, invitations, memberships
- **AI Generation**: Prompts, providers, usage tracking

### Integration Tests (TODO)

Would test actual database interactions:

```python
# Example integration test
@pytest.mark.integration
def test_create_campaign_integration(supabase_client, auth_token):
    response = client.post("/api/campaigns", ...)
    assert response.status_code == 201
```

### E2E Tests (TODO)

Full flow tests with real services:

```python
# Example E2E test
@pytest.mark.e2e
def test_full_ad_serving_flow():
    # 1. Create campaign
    # 2. Add assets
    # 3. Create pools
    # 4. Serve ad
    # 5. Track impression
    pass
```

## Fixtures

Common fixtures are defined in `conftest.py`:

| Fixture | Description |
|---------|-------------|
| `mock_supabase` | Mocked Supabase client |
| `mock_user` | Standard authenticated user |
| `mock_admin_user` | Admin user |
| `sample_campaign` | Example campaign data |
| `sample_asset` | Example asset data |
| `sample_pool` | Example pool data |
| `sample_organization` | Example organization data |
| `sample_api_key` | Example API key data |
| `analytics_data` | Example analytics response |
| `valid_token` | Valid JWT for auth |
| `auth_headers` | Authorization headers |

## Writing Tests

### Test Naming Convention

```python
class TestFeatureName:
    """Tests for specific feature."""
    
    def test_action_expected_result(self):
        """Should describe what the test verifies."""
        pass
```

### Test Structure (AAA Pattern)

```python
def test_example(self, mock_supabase, sample_campaign):
    # Arrange
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = [sample_campaign]
    
    # Act
    result = mock_supabase.table("campaigns").select("*").execute()
    
    # Assert
    assert len(result.data) == 1
```

### Mocking Supabase

```python
def test_with_mock(self, mock_supabase):
    # Mock a successful query
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "123", "name": "Test"}
    ]
    
    # Mock an empty result
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    # Mock an error
    mock_supabase.table.return_value.select.return_value.execute.side_effect = Exception("DB Error")
```

## Coverage Goals

| Module | Target | Notes |
|--------|--------|-------|
| `routes/` | 80% | API endpoints |
| `services/` | 90% | Business logic |
| `core/` | 85% | Auth, config |
| Overall | 75% | Minimum acceptable |

## CI/CD Integration

Tests run automatically on:

- **PR Check**: All tests must pass before merge
- **Deploy**: Tests run before staging/production deploy

See `.github/workflows/pr-check.yml` for configuration.

## Debugging Tests

### Print Debug Info

```python
def test_debug(self, capsys):
    print("Debug info")
    with capsys.disabled():
        print("This prints even with pytest capture")
```

### Use pdb

```bash
pytest --pdb  # Drop into debugger on failure
```

### Verbose Assertions

```python
def test_verbose(self, sample_campaign):
    assert sample_campaign["name"] == "Expected", f"Got: {sample_campaign}"
```

## TODO

- [ ] Add integration tests with test database
- [ ] Add E2E tests
- [ ] Add performance tests for analytics queries
- [ ] Add load tests for ad serving endpoint
- [ ] Set up test database seeding

---

*Last updated: February 6, 2026*
