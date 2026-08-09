# QuantDeck

Quantitative finance interview prep — 833 problems across probability, statistics, brainteasers, calculus, linear algebra, game theory, and combinatorics.

## Features

- **Filter & search** — by topic, difficulty, company, and status (All / Saved / Unsolved)
- **Saved questions** — bookmark for revision, synced across devices
- **Per-question notes** — split-pane sidebar, auto-saved, synced
- **Focus Mode** — timed hint/solution unlocking (10 min → Hint 1, +5 min each)
- **Answer checker** — for problems with numeric/short answers
- **Cross-device sync** — solved, saved, and notes all sync via Supabase

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Supabase credentials (see below)
npm run dev
```

## Supabase (one-time)

1. Create a free project at [supabase.com](https://supabase.com)
2. In the **SQL editor**, run:
```sql
create table if not exists qd_sync (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table qd_sync disable row level security;
```
3. Go to **Settings → API**, copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
4. Paste into `.env`

For GitHub Actions, add both as **repository secrets** (`Settings → Secrets → Actions`).

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
