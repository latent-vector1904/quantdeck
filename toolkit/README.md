# QuantDeck Toolkit

Three things you can do:

1. **Scrape** all problems from quantprof.org into a JSON file.
2. **Browse** them locally as a web app (filters, search, hints, solution reveal, progress tracking, bookmarks, notes).
3. **Print** them as LaTeX workbook sheets (15 problems each — 55 sheets to do in a month).

Also ships with a one-command deploy script to push fresh data to the live GitHub Pages site.

> Data is scraped from quantprof.org — the site itself is rebranded as **QuantDeck**.

## Folder map

```
quantprof_toolkit/
├── README.md              ← you are here
├── SETUP.md               ← one-time Python + LaTeX setup
├── 1_scraper/             ← extract problems from quantprof.org
│   ├── quantprof_scraper.py
│   ├── README.md
│   └── console_snippets.md
├── 2_local_site/          ← build a local web app from the scraped JSON
│   ├── build_site.py
│   ├── template.html
│   └── README.md
└── 3_workbook/            ← build LaTeX problem sheets
    ├── build_workbook.py
    └── README.md

(root)
├── update_deploy.py       ← swap data in deployed site + push to GitHub Pages
├── build_site.py          ← shortcut copy of 2_local_site/build_site.py
└── quantprof-deploy/      ← the live GitHub Pages repo (index.html)
```

## Order of operations

1. Do **SETUP.md** once — venv + pip installs.
2. Do **1_scraper** to get `quantprof_problems.json` (~833 problems).
   - Token via `export QUANTPROF_ID_TOKEN=…` (do not leave JWTs in this share).
3. Propagate into the Syncthing share (from share root):
   ```bash
   python3 scripts/refresh_questions.py toolkit/1_scraper/quantprof_problems.json
   ```
4. Then either:
   - open `standalone/` HTML, or
   - **2_local_site** for a rebuild, or
   - **3_workbook** for printable LaTeX sheets,
   - or the React app in `quantdeck/`.

The output of step 2 is the input to steps 3–4. See share-root `AGENT_README.md` for the full scrape checklist.
