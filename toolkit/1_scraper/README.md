# 1. Scraper

Extracts every problem from quantprof.org into `quantprof_problems.json`.

## How it works

The site is a Firebase/Firestore SPA. Listing the `/problems` collection is
blocked by security rules, but reading individual `topics/{id}` docs (where
the full problem content actually lives) is allowed for premium users.

Two-step approach:
1. Pull the **list** of all problem IDs from your browser's IndexedDB cache
   (Firestore caches everything you've browsed locally).
2. For each ID, fetch the full content via Firestore REST API using your
   auth token.

## Steps

### 1. Make sure you're logged in to quantprof.org in Brave

Just visit the site, log in, and visit `/problems` so the listing gets cached.

### 2. Get the problem index

Open Brave DevTools (Cmd+Option+I), go to **Console**, paste the
"Get problem_index.json" snippet from `console_snippets.md`. A JSON file
will download to your Downloads folder. Move it to this folder.

### 3. (Optional) Get course + chapter names

Run the "Get course_chapter_index.json" snippet from `console_snippets.md`.
Move the downloaded file here too. (Not required, but enables nicer chapter
names in the local site.)

### 4. Get a fresh Firebase ID token

Reload quantprof.org first (Cmd+R) to get a fresh ~1-hour token. Then
paste the "Get ID token" snippet from `console_snippets.md` into Console.
Copy the token printed between `=== TOKEN ===` markers.

### 5. Provide the token (do not commit it)

Prefer an environment variable (safe for Syncthing shares):
```bash
export QUANTPROF_ID_TOKEN='your-fresh-token'
```

Or temporarily set it in `quantprof_scraper.py`:
```python
ID_TOKEN = "PASTE_YOUR_TOKEN_HERE"
```
Never leave a real JWT in a folder you sync/share.

### 6. Set TEST_MODE

In the same script:
```python
TEST_MODE = False   # True = first 5 problems only (to verify it works)
```

Test with `True` first if you want — you'll get 5 problems quickly.
Then switch to `False` for the full ~828.

### 7. Run

```bash
source ~/qp_env/bin/activate
python3 quantprof_scraper.py
```

Takes ~15 minutes for the full 828.

### Token expired mid-scrape?

The script saves progress every 25 problems. If your token expires:
1. Reload quantprof.org for a fresh token
2. Grab it via the snippet
3. `export QUANTPROF_ID_TOKEN='…new token…'` (or temporarily paste into the script)
4. Run the script again — it auto-resumes from the last save point

### After a successful scrape

From the **share root** (`quantdeck-share/`):

```bash
python3 scripts/refresh_questions.py toolkit/1_scraper/quantprof_problems.json
```

This copies/slims questions into `questions/`, toolkit folders, `quantdeck/public/`,
and rebuilds `standalone/` HTML. It does **not** git push.
