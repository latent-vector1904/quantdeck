# QuantDeck

Quantitative finance interview prep — 833 problems across probability, statistics, brainteasers, calculus, linear algebra, game theory, and combinatorics.

## Features

- **Filter & search** — by topic, difficulty, company, and status (All / Saved / Unsolved)
- **Saved questions** — bookmark for revision, synced across devices
- **Per-question notes** — split-pane sidebar, auto-saved, synced
- **Focus Mode** — timed hint/solution unlocking (10 min → Hint 1, +5 min each)
- **Answer checker** — for problems with numeric/short answers
- **Cross-device sync** — solved, saved, and notes sync via Upstash Redis

## Setup

```bash
npm install
cp .env.example .env
# Fill in Upstash REST URL + token (see below), or leave blank and paste them in Settings
npm run dev
```

## Upstash sync (one-time)

1. Create a free Redis database at [console.upstash.com](https://console.upstash.com)
2. Open the DB → **REST API** → copy:
   - `UPSTASH_REDIS_REST_URL` → `VITE_UPSTASH_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN` → `VITE_UPSTASH_REST_TOKEN`
3. Paste into `.env` (gitignored) **or** enter them in the app **Settings** gear

Keys stored remotely (namespaced):

| Key | Contents |
|---|---|
| `quantdeck:solved` | JSON array of solved problem IDs |
| `quantdeck:saved` | JSON array of saved problem IDs |
| `quantdeck:notes` | JSON object of `{ problemId: noteText }` |

Local progress always lives in `localStorage`. On load (and every 5s online), the app union-merges local + remote and writes back.

For GitHub Actions / Pages, add both as **repository secrets** (`Settings → Secrets → Actions`).

## Update problems

After a fresh scrape:
```bash
python3 scripts/update_problems.py
# or with a custom path:
python3 scripts/update_problems.py /path/to/quantprof_problems.json
```

This updates `public/problems.json`, commits, and pushes — GitHub Actions redeploys.

You can also upload a new JSON from the app's **Settings** (gear icon) without touching the terminal.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus search |
| `Tab` | Toggle Problem ↔ Solution |
| `N` | Toggle notes sidebar |
| `F` | Toggle focus mode popover |
| `← / h` | Previous problem |
| `→ / l` | Next problem |
| `Escape` | Close popover / notes / back to list |

## Deploy

Push to `main` — GitHub Actions builds and deploys automatically.

First time only: go to **Settings → Pages → Source → GitHub Actions**.
