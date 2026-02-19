# DCO Platform — User Guide

A practical guide for marketers and campaign managers.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Campaign](#creating-your-first-campaign)
3. [Managing Assets](#managing-assets)
4. [Setting Up Signals](#setting-up-signals)
5. [Asset Pools & Selection Logic](#asset-pools--selection-logic)
6. [Generating Creatives with AI](#generating-creatives-with-ai)
7. [Analytics & Performance](#analytics--performance)
8. [Team Collaboration](#team-collaboration)
9. [API Integration](#api-integration)
10. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### What is DCO?

**Dynamic Creative Optimization** automatically serves the right ad creative to the right person at the right time, based on real-time signals like:

- 🌤️ **Weather** — Show hot coffee ads when it's cold, iced drinks when it's hot
- 🕐 **Time of day** — Different messaging for morning commuters vs. evening browsers
- 📍 **Location** — Localized content, regional offers, store proximity
- 📱 **Device** — Mobile-first vs. desktop experiences
- 👤 **Audience** — Segment-specific messaging

### Dashboard Overview

When you log in, you'll see:

| Section | Description |
|---------|-------------|
| **Campaigns** | Your active and draft campaigns |
| **Analytics** | Performance metrics and insights |
| **Assets** | Your creative library |
| **AI Generator** | Create new visuals with AI |
| **API Keys** | Manage programmatic access |
| **Organization** | Team and settings |

---

## Creating Your First Campaign

### Step 1: Create Campaign

1. Click **"New Campaign"** on the dashboard
2. Fill in:
   - **Name**: Something descriptive (e.g., "Summer Sale 2026 - Apparel")
   - **Status**: Start with "Draft"

### Step 2: Add Base Creative

Your base creative is the default ad that shows when no signals match:

```
┌─────────────────────────────┐
│  [LOGO]                     │
│                             │
│  Your Summer Sale           │
│  Up to 50% off              │
│                             │
│  [SHOP NOW]                 │
└─────────────────────────────┘
```

### Step 3: Define Signals

Signals are the conditions that trigger different creatives:

| Signal | Example Condition | Creative Variation |
|--------|-------------------|-------------------|
| Weather | temp < 10°C | Show winter jackets |
| Weather | temp > 30°C | Show swimwear |
| Daypart | 6am-10am | "Start your morning right" |
| Daypart | 8pm-12am | "Wind down your evening" |
| Geo | city = "Montevideo" | Local store address |

### Step 4: Activate

Change status to **"Active"** when ready. Your ad tag will start serving dynamic creatives.

---

## Managing Assets

### Uploading Assets

**Single upload:**
1. Go to Campaign → Assets
2. Click "Upload Asset"
3. Select file (images, videos, HTML5)

**Bulk upload:**
1. Click "Bulk Upload"
2. Drag & drop multiple files
3. Assign folder and tags
4. Watch progress

### Organizing with Folders

Create folders for logical groupings:

```
📁 Campaign: Summer Sale
├── 📁 Headers
│   ├── header-beach.jpg
│   └── header-pool.jpg
├── 📁 Products
│   ├── swimwear-collection.jpg
│   └── sandals-lineup.jpg
└── 📁 CTAs
    ├── shop-now-red.png
    └── shop-now-blue.png
```

### Using Tags

Tags help you find and filter assets:

- `#hero` — Main images
- `#mobile` — Mobile-optimized
- `#weather-hot` — For hot weather signals
- `#cta` — Call-to-action buttons

### Batch Operations

Select multiple assets to:
- **Delete** — Remove selected
- **Move** — Change folder
- **Tag** — Add/remove tags

---

## Setting Up Signals

### Weather Signals

```json
{
  "type": "weather",
  "condition": "temperature",
  "operator": "less_than",
  "value": 15,
  "unit": "celsius"
}
```

**Available conditions:**
- Temperature (hot/cold thresholds)
- Precipitation (rain, snow)
- Wind speed
- UV index

### Time Signals (Daypart)

```json
{
  "type": "daypart",
  "periods": ["morning", "afternoon", "evening", "night"]
}
```

**Periods:**
| Period | Hours |
|--------|-------|
| Morning | 6am - 12pm |
| Afternoon | 12pm - 6pm |
| Evening | 6pm - 10pm |
| Night | 10pm - 6am |

### Geo Signals

```json
{
  "type": "geo",
  "match": "city",
  "values": ["Montevideo", "Buenos Aires"]
}
```

**Match types:** country, region, city, zip, radius

### Device Signals

```json
{
  "type": "device",
  "match": ["mobile", "tablet"]
}
```

---

## Asset Pools & Selection Logic

### How Pools Work

Pools define **which assets serve** for a **specific signal combination**:

```
Signal: weather=hot AND daypart=afternoon
Pool: [beach-hero.jpg, pool-hero.jpg, ice-cream-cta.png]
Selection: random (or weighted)
```

### Pool Types

| Type | Behavior |
|------|----------|
| **Random** | Equal chance for each asset |
| **Weighted** | Assign percentages (e.g., 70/30) |
| **Sequential** | Rotate through in order |
| **Optimized** | AI picks best performer (future) |

### Creating a Pool

1. Campaign → Pools → "New Pool"
2. Select signal combination
3. Add assets to the pool
4. Choose selection type
5. Set weights (if weighted)

---

## Generating Creatives with AI

### Quick Generate

1. Go to **AI Generator**
2. Enter a prompt:
   ```
   Create a summer sale banner with beach vibes,
   bright colors, featuring sunglasses and a
   "Shop Now" button
   ```
3. Select style (photorealistic, illustration, minimal)
4. Click **Generate**
5. Save to campaign assets

### Prompt Tips

✅ **Good prompts:**
- "Product photo of white sneakers on concrete, dramatic lighting, no background"
- "Illustrated coffee cup with steam, warm autumn colors, cozy vibes"

❌ **Avoid:**
- "Make me a good ad" (too vague)
- Very long prompts with conflicting directions

### Using Templates

Pre-built templates for common ad formats:

- Product showcase
- Hero banner
- Social media square
- Story format (9:16)

### Variations

From any generated image:
1. Click "Variations"
2. Get 4 similar versions
3. Pick your favorite

---

## Analytics & Performance

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Impressions** | Times your ad was shown |
| **Clicks** | Times users clicked |
| **CTR** | Click-through rate (clicks/impressions) |
| **Lift** | Performance improvement vs. baseline |

### Signal Performance

See which signals drive the best results:

```
Weather: Hot  → CTR: 3.2% (+45% lift)
Weather: Cold → CTR: 2.1% (-5% lift)
Daypart: Morning → CTR: 2.8% (+27% lift)
```

### Date Ranges

Compare performance across:
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

### Export

Download reports as CSV for further analysis.

---

## Team Collaboration

### Organizations

Create an organization for your team:
1. Settings → Organization → Create
2. Invite team members
3. Assign roles

### Roles & Permissions

| Role | Can do |
|------|--------|
| **Owner** | Everything + delete org |
| **Admin** | Manage members, campaigns, settings |
| **Member** | Create/edit campaigns and assets |
| **Viewer** | View only, no edits |

### Invitations

1. Go to Organization → Members
2. Click "Invite"
3. Enter email and select role
4. They receive an email with invite link

---

## API Integration

### Getting Your API Key

1. Go to **API Keys** page
2. Click "Create API Key"
3. Name it (e.g., "Production Server")
4. Select scopes:
   - `serve` — Ad serving only
   - `read` — Read campaigns/analytics
   - `write` — Create/update campaigns
   - `analytics` — Detailed analytics
   - `admin` — Full access
5. Copy the key (shown only once!)

### Basic Usage

```bash
# Serve an ad
curl "https://api.yourdco.com/serve/CAMPAIGN_ID" \
  -H "Authorization: Bearer dco_live_xxx..."

# Get campaign
curl "https://api.yourdco.com/campaigns/CAMPAIGN_ID" \
  -H "Authorization: Bearer dco_live_xxx..."
```

### Ad Tag Integration

Place this on your page:

```html
<script src="https://api.yourdco.com/tag.js"></script>
<div data-dco-campaign="CAMPAIGN_ID"></div>
```

The tag automatically:
- Detects user signals (geo, device, time)
- Fetches weather data
- Renders the optimal creative

---

## Tips & Best Practices

### 1. Start Simple

Begin with 2-3 signals, then expand:
- ✅ Weather + Daypart
- ❌ 10 signals at once

### 2. Test Your Baseline

Run without signals for 1 week to establish baseline CTR.

### 3. Meaningful Variations

Don't just change colors. Change:
- Messaging
- Product focus
- Offer type
- Urgency level

### 4. Monitor Daily

Check analytics daily in the first week to catch issues.

### 5. Iterate Based on Data

- High CTR signal → create more variations
- Low CTR signal → reconsider or remove

### 6. Asset Quality

Higher quality assets = better performance:
- Proper dimensions
- Fast loading (compressed)
- Mobile-optimized

### 7. Naming Conventions

Use consistent naming:
```
[campaign]-[signal]-[variant]-[size]
summer-sale-hot-beach-300x250.jpg
summer-sale-cold-sweater-300x250.jpg
```

---

## Troubleshooting

### "No creative served"

- Check campaign is **Active**
- Verify base creative exists
- Check API key has `serve` scope

### "Wrong creative showing"

- Review signal conditions
- Check pool assignments
- Verify signal detection (geo, weather API)

### "Analytics not updating"

- Allow 1-2 hours for aggregation
- Check impression tracking pixel
- Verify events are being sent

---

## Need Help?

- 📧 support@souts.com
- 📖 Full API docs: `/docs/api`
- 💬 Slack: #dco-support

---

*Last updated: February 2026*
