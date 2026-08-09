# Agent brief — set up QuantDeck for someone else

You are setting up **QuantDeck** (quant interview problem browser) on a recipient’s machine from this Syncthing share. The share is intentionally **secret-free**: no auth tokens, no personal cloud sync IDs, no Supabase keys, no personal progress.

## What this folder is

| Path | Purpose |
|---|---|
| `questions/` | Ready-to-use problem dumps (~833 questions) |
| `toolkit/` | Scraper + local HTML builder + LaTeX workbook builder |
| `toolkit/1_scraper/` | Scrape new questions from quantprof.org |
| `scripts/refresh_questions.py` | After scrape: update all question copies + standalone HTML |
| `quantdeck/` | React (Vite) app source |
| `standalone/` | Prebuilt single-file HTML (open in browser, no install) |
| `.stignore` | Syncthing ignore rules (node_modules, `.env`, secrets, etc.) |

## Hard rules (do not violate)

1. **Never** paste or commit Firebase / Supabase / other cloud credentials into this shared folder.
2. **Never** copy the recipient’s `.env` or tokens back into Syncthing.
3. **Never** reuse the sender’s cloud sync project — if they want sync, create **their own** Supabase (or skip sync; localStorage works).
4. If you scrape again, put the token in an env var outside the share:
   ```bash
   export QUANTPROF_ID_TOKEN='…fresh token…'
   ```
   The scraper reads `QUANTPROF_ID_TOKEN` and falls back to `PASTE_YOUR_TOKEN_HERE`.
5. Do not reintroduce personal paths, emails, or sync bucket/project IDs into shared files.

## Fastest path for the recipient (no install)

1. Open `standalone/quantdeck.html` or `standalone/quantdeck_local.html` in a browser.
2. Progress (solved / saved / notes) stays in **that browser’s localStorage** only.
3. Images need internet (Firebase CDN URLs).

## Option A — Local HTML rebuild from JSON

```bash
cd toolkit
python3 -m venv ~/qp_env
source ~/qp_env/bin/activate
pip install requests Pillow
cd 2_local_site
# questions JSON already present; or copy from ../../questions/quantprof_problems.json
python3 build_site.py
open quantprof_local.html   # or xdg-open on Linux
```

See `toolkit/SETUP.md` and `toolkit/2_local_site/README.md`.

## Option B — React app (QuantDeck) with optional cloud sync

```bash
cd quantdeck
npm install
cp .env.example .env
# Leave .env empty placeholders → localStorage-only mode works.
# OR create THEIR OWN Supabase project and fill:
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...
npm run dev
```

Supabase one-time SQL (their project):

```sql
create table if not exists qd_sync (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table qd_sync disable row level security;
```

Problems are in `quantdeck/public/problems.json` (also mirrored under `questions/problems.json`).

To refresh from a new scrape:

```bash
python3 quantdeck/scripts/update_problems.py /path/to/quantprof_problems.json
```

## Option C — Printable workbook (LaTeX)

```bash
source ~/qp_env/bin/activate
cd toolkit/3_workbook
python3 build_workbook.py
# needs MacTeX / TeX Live, or upload .tex to Overleaf
```

## Scrape new questions (requires quantprof.org access)

Recipient needs a logged-in (usually premium) browser session. Full detail also lives in `toolkit/1_scraper/README.md` and `toolkit/1_scraper/console_snippets.md`.

### Prerequisites

```bash
python3 -m venv ~/qp_env
source ~/qp_env/bin/activate
pip install requests Pillow
```

### Step-by-step

1. **Log in** at https://quantprof.org in Chrome/Brave/Firefox. Open `/problems` and scroll/filter so the index caches in IndexedDB.

2. **Export problem index** — DevTools → Console → paste snippet **“1. Get the problem index”** from `toolkit/1_scraper/console_snippets.md`. Move downloaded `problem_index.json` into `toolkit/1_scraper/`.

3. **(Optional)** Run snippet **“2. Get course + chapter names”** → move `course_chapter_index.json` into `toolkit/1_scraper/` (and `toolkit/2_local_site/` if rebuilding the local site).

4. **Get a fresh Firebase ID token** — reload the site (`Cmd+R` / `Ctrl+R`), then paste snippet **“3. Get ID token”**. Copy the token between the markers. Tokens last ~1 hour.

5. **Export the token in the shell** (never write the JWT into a synced file):
   ```bash
   export QUANTPROF_ID_TOKEN='paste-token-here'
   ```

6. **(Optional smoke test)** In `toolkit/1_scraper/quantprof_scraper.py` set `TEST_MODE = True` for 5 problems first; then set `TEST_MODE = False` for the full set.

7. **Run the scraper**:
   ```bash
   source ~/qp_env/bin/activate
   cd toolkit/1_scraper
   python3 quantprof_scraper.py
   ```
   Full scrape takes ~10–20 minutes. Progress is saved every 25 problems; if the token expires, get a new one, re-export `QUANTPROF_ID_TOKEN`, and re-run — it resumes.

8. **Distribute into the share** (from share root):
   ```bash
   cd ../..   # back to quantdeck-share/
   python3 scripts/refresh_questions.py toolkit/1_scraper/quantprof_problems.json
   ```
   This updates:
   - `questions/quantprof_problems.json` + `questions/problems.json`
   - `toolkit/*/quantprof_problems.json`
   - `quantdeck/public/problems.json`
   - `standalone/*.html` (rebuilt)

9. **Unset the token**:
   ```bash
   unset QUANTPROF_ID_TOKEN
   ```
   Confirm nothing sensitive was written into the share:
   ```bash
   rg -n 'eyJhbGci' .
   ```

10. Syncthing will sync the new question files to other devices. Do **not** sync `.env` or tokens.

### Also useful

- React-only slim update (no git push unless `--push`):
  ```bash
  python3 quantdeck/scripts/update_problems.py questions/quantprof_problems.json
  ```
- Workbook rebuild after new questions: `cd toolkit/3_workbook && python3 build_workbook.py`

## Syncthing setup checklist

On the **sender** (already done if they gave you this folder):

- [ ] Folder type: Send & Receive (or Send Only if they only distribute)
- [ ] `.stignore` present (keeps `node_modules`, `.env`, secrets out)
- [ ] Confirm no JWTs or personal sync IDs remain:
  ```bash
  rg -n 'eyJhbGci|SUPABASE_ANON_KEY=[^y]|Bearer ey' .
  ```

On the **recipient**:

- [ ] Install Syncthing, accept the share, wait for full sync
- [ ] Prefer Option “standalone HTML” first to verify questions load
- [ ] If using React: `npm install` locally (ignored by Syncthing)
- [ ] Create **their own** Supabase (or skip cloud sync)
- [ ] Do not put `.env` inside the synced folder if they want it private — or rely on `.stignore` excluding `.env`

## What was deliberately excluded from this share

- Firebase ID tokens / account JWTs
- Personal cloud sync bucket/project IDs and progress
- Supabase project credentials
- `.claude/` local settings, personal emails/paths
- `node_modules/`, `.git/`, deploy repos with live personal sync URLs
- Generated workbook PDF/TeX logs (rebuildable)

## Questions data location

Canonical dumps:

- `questions/quantprof_problems.json` — full scrape
- `questions/problems.json` — slim web payload (~833 questions)
- `questions/problem_index.json` / `course_chapter_index.json` — indexes for scraper/UI

If anything is missing after sync, copy from `toolkit/1_scraper/` (same files are duplicated there for script convenience).

## Done when

- Recipient can open problems (standalone or `npm run dev`)
- Recipient (or you) can scrape new questions via the checklist above and run `scripts/refresh_questions.py`
- No shared credentials / JWTs exist in the folder
- Optional: their own Supabase sync works with **their** `.env` (not synced)
