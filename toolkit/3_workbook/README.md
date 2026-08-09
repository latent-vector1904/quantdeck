# 3. Workbook (LaTeX problem sheets)

Generates printable problem sheets from `quantprof_problems.json`. Each
sheet has 15 problems followed by their hints and solutions, matching
the website's natural ordering (course → chapter → order).

55 sheets × 15 problems ≈ 828 problems total. At 2 sheets/day, you finish
the whole set in a month.

## Steps

1. Copy your `quantprof_problems.json` into this folder.
2. Run:

```bash
source ~/qp_env/bin/activate
python3 build_workbook.py
```

This generates:
- `sheets/sheet_01.tex` ... `sheet_55.tex` — one LaTeX file per sheet
- `sheets/INDEX.md` — list of all sheets and their problem ranges
- `sheets/build_all.sh` — convenience script to compile every sheet
- `workbook_images/` — downloaded images referenced in problems/solutions

3. Compile a single sheet:

```bash
cd sheets
pdflatex sheet_01.tex
pdflatex sheet_01.tex   # second pass for correct page numbers
```

Or compile all 55 at once:

```bash
cd sheets
./build_all.sh
```

## Customize

In `build_workbook.py`:

```python
SHEET_SIZE = 15      # problems per sheet — change to 20, 30, etc.
```

## Sheet structure

- Cover: "Sheet N of 55", problem range
- Problems section (numbered 1–15 within the sheet, just question text)
- "Hints & Solutions" section, per problem:
  - Hint 1, Hint 2, ... (numbered, only those with content)
  - Solution
  - Italic answer line at the bottom

## Notes

- Webp images are auto-converted to PNG (needs Pillow installed —
  see `SETUP.md`).
- If a download or conversion fails, the image is silently skipped — the
  rest of the document still compiles.
- If you hit a missing-package error from `pdflatex` (e.g. `adjustbox.sty
  not found`), install with: `sudo tlmgr install <package>`.
