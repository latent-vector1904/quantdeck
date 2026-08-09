# 2. Local Site (QuantDeck)

Build a self-contained HTML file from `quantprof_problems.json` — open it
in any browser, no server needed.

## Steps

1. Copy your `quantprof_problems.json` into this folder (from step 1).
2. *(Optional)* If you grabbed `course_chapter_index.json`, copy it here too.
3. Run:

```bash
source ~/qp_env/bin/activate
python3 build_site.py
```

This generates `quantprof_local.html`.

4. Double-click `quantprof_local.html` — opens in your default browser.

## Features

- **Search & filter**: by topic, difficulty level, company logos
- **Status filters**: All / Saved / Unsolved — quick pills to filter the problem list
- **Problem detail**: question (with KaTeX-rendered LaTeX math), answer
  checker, expandable hints, expandable solution
- **Save for later**: bookmark questions for revision — toggle from the list
  (bookmark icon) or the detail view (save button)
- **Notes**: per-question notes tab with auto-saving textarea (debounced),
  character count, and "Saved" indicator
- **Progress tracking**: solved problems saved in browser localStorage
- **Keyboard shortcuts**:
  - `←` / `→` or `h` / `l` — previous / next problem
  - `Tab` — cycle through Problem → Solution → Notes tabs
  - `/` — focus search
  - `Esc` — back to list

## Data storage

All user data is stored in browser `localStorage`:

| Key | What it stores |
|---|---|
| `qp_solved_v4` | Set of solved problem IDs |
| `qp_saved_v1` | Set of bookmarked/saved problem IDs |
| `qp_notes_v1` | Object mapping problem IDs to note text |

- Everything is browser-local only (localStorage) unless the recipient configures their own cloud sync separately.

## Notes

- Images load from Firebase URLs at runtime — needs internet.
- Re-run `build_site.py` after re-scraping to refresh.
- Your progress/notes are per-browser. Back up via DevTools Console:
  `localStorage.getItem('qp_saved_v1')` or `localStorage.getItem('qp_notes_v1')`.
