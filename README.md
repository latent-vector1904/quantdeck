# QuantDeck share (Syncthing)

Interview prep pack: **~833 quant problems** + tools to browse / rebuild / print them.

**No secrets included.** Your progress stays on your machine (browser localStorage). Optional cloud sync uses *your* Upstash Redis REST credentials only — never put them in this folder if you share it further.

## Quick start

Open either file in a browser:

- `standalone/quantdeck.html`
- `standalone/quantdeck_local.html`

## What’s inside

- `questions/` — problem JSON (include this when sharing)
- `toolkit/` — scrape / local site / LaTeX workbook
- `scripts/refresh_questions.py` — push a new scrape into all the right places
- `quantdeck/` — React app (`npm install && npm run dev`)
- `AGENT_README.md` — instructions for an AI agent setting this up for someone else
- `.stignore` — keeps `node_modules`, `.env`, and credential-like files out of Syncthing

## Scrape new questions

Needs a logged-in quantprof.org session. Short path:

1. Follow `toolkit/1_scraper/README.md` (console snippets in `console_snippets.md`).
2. Put the Firebase token in an env var only — never in a synced file:
   ```bash
   export QUANTPROF_ID_TOKEN='…'
   cd toolkit/1_scraper && python3 quantprof_scraper.py
   ```
3. From the share root, refresh copies + standalone HTML:
   ```bash
   python3 scripts/refresh_questions.py
   unset QUANTPROF_ID_TOKEN
   ```

Full agent-oriented steps: see **“Scrape new questions”** in `AGENT_README.md`.

## Syncthing

Share the entire `quantdeck-share` folder. `.stignore` is already configured.

## More detail

See `toolkit/README.md`, `toolkit/SETUP.md`, and `quantdeck/README.md`.
For agent-driven setup on another person’s machine, give them this folder and point the agent at `AGENT_README.md`.
