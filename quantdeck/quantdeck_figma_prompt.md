# QuantDeck — Figma Design Prompt

> Attach `quantdeck_figma_sample.json` alongside this prompt.
> Use it to populate all tables, cards, and detail views with realistic data.

---

## What Is QuantDeck?

QuantDeck is a **quantitative finance interview prep platform** — think LeetCode,
but for quant traders, researchers, and engineers at firms like Jane Street,
Citadel, Two Sigma, and Optiver.

Users browse 833 problems across topics like probability, statistics, brainteasers,
linear algebra, combinatorics, and calculus. Each problem has hints (progressively
revealed), a solution, an answer checker, and difficulty ratings. The platform is
a single self-contained HTML file deployed on GitHub Pages.

---

## The Data Pipeline (important context for "upload new data" feature)

Problems are scraped from quantprof.org using a Python script. The scraped JSON
(`quantprof_problems.json`) is embedded directly inside the HTML by a second script
(`update_deploy.py`), which then commits and pushes to GitHub Pages — the whole
site redeploys in one command.

**Design an "Update Problems" flow in the admin / settings panel:**
- A drag-and-drop JSON upload area (for re-uploading a fresh `quantprof_problems.json`)
- A preview: "Found 851 problems (↑18 new)" with a diff summary by topic
- A confirm button: "Update & Deploy"
- Progress states: Parsing → Embedding → Deploying → Live ✓

---

## Cross-Device Sync (critical feature — show syncing states clearly)

All user progress can sync across devices via the recipient's own cloud backend (optional):

| Data | Sync | Conflict resolution |
|---|---|---|
| **Solved problems** | ✅ Cloud (optional, recipient-owned) | Union merge |
| **Saved/bookmarked problems** | ✅ Cloud (optional, recipient-owned) | Union merge |
| **Notes** | ✅ Cloud (optional, recipient-owned) | Longer note wins |

Design the following sync states:
- **Syncing indicator** — subtle spinning icon or pulsing dot in the navbar (not intrusive)
- **Sync success** — brief "Synced" toast, bottom-right, fades after 2s
- **Offline banner** — thin top bar: "You're offline — changes saved locally and will sync when reconnected"
- **Conflict resolved** — "Note updated from another device" soft toast

---

## Design System

```
Background:    #0E1117
Surface:       #12151C
Muted:         #181D28
Border:        #1E2433
Text:          #F5F8FF
Text dim:      #7A8BAA
Text faint:    #3A4560
Accent:        hsl(258, 92%, 68%)   ≈ #7C5CFC  (indigo-violet)
Accent dim:    hsl(258, 75%, 76%)   ≈ #A890F5
Accent bg:     #7C5CFC1A
Saved amber:   #F5C842
Easy green:    #4ADE80
Medium amber:  #FACC15
Hard red:      #F87171
Font:          Inter / system-ui, 16px base
Radius:        8px cards, 6px buttons, 999px pills
```

No gradients on surfaces. No drop shadows on cards. Borders only — very subtle.
The app should feel like a tool a quant fund uses internally.

---

## Screen 1 — Problem List

**Navbar (60px, sticky):**
- Left: QuantDeck logo (2×2 violet square grid) + "QuantDeck" wordmark
- Right: subtle sync indicator dot

**Filter bar:**
- Search input (placeholder: "Search problems…")
- Topic dropdown (values from JSON: probability, statistics, brainteasers, etc.)
- Level dropdown (1–10)

**Status pills (below filters):**
`All` | `Saved` | `Unsolved`  — pill style, active pill has violet background

**Metadata line:**
`833 problems  ·  12 solved  ·  3 saved`
Solved count in accent color. Saved count in amber.

**Problem table:**

| # | Title | Topic | Difficulty | Asked In | 🔖 | Status |
|---|---|---|---|---|---|---|
| 1 | Non-empty Intersection | `probability` pill | `7/10` red pill | Jane Street + Jump logos | outline bookmark | empty circle |
| 2 | Gambler's Ruin | `probability` pill | `5/10` amber pill | Citadel logo | filled amber bookmark | ✓ violet circle |

- Topic pills: each topic has its own subtle hue (probability=violet, statistics=blue, brainteasers=orange, calculus=cyan, combinatorics=pink)
- Difficulty pills: ≤3 green, 4–6 amber, ≥7 red
- Company logos: 20px circles, up to 5 per row
- Bookmark icon column: outline = unsaved, filled amber = saved. Clicking it toggles without opening the problem.
- Status: small circle, filled violet + checkmark = solved
- Solved rows: title text in accent dim tint
- Row hover: very subtle `#1A1F2E` background

**Pagination:** Previous ← | 1 2 3 … 42 | → Next

---

## Screen 2 — Problem Detail

Max 860px centered content. Detail view replaces the list (no modal, no split).

**Top action bar (full width):**
`← Back` button | Problem title breadcrumb (truncated) | `← Prev` `Next →` nav buttons | `✓ Solved` badge (violet, only visible when solved)

**Tab row (inside content area):**
- Left: `Problem` | `Solution` tab switcher (pill style, active tab has muted fill)
- Right action icons (36×36 each, icon buttons with border):
  - 🕐 Focus Mode — clock icon; **pulsing violet dot** when running, amber dot when paused
  - 📄 Notes — document icon; **glows violet** when notes pane is open
  - 🔖 Save — bookmark icon; filled amber when saved
  - ↑ Share — upload icon

**Problem tab content:**
- Large bold title (28px, 700)
- Problem body (17px, 1.85 line-height, LaTeX math rendered)
- Answer input + violet Submit button (shows ✓ Correct / ✗ Try again feedback)
- "Mark as solved" button (fills violet when solved)

**Solution tab content:**
- Collapsible hint cards (`Hint 1`, `Hint 2`, `Hint 3` …) — label in accent dim
- Collapsible solution cards (`Solution`)
- Each card: subtle border, expand/collapse chevron, body revealed on click

**Focus Mode locked state (when Focus Mode is running):**
Hint/solution cards show:
- Lock icon left of label
- Countdown timer right of label: `08:23`
- `unlock now` text link (small, muted, underlined)
- Card is non-interactive until timer unlocks it

---

## Screen 3 — Focus Mode Popover

Anchored below the clock icon. 320px wide. Floats above content.

```
┌──────────────────────────────────────────┐
│              12:47                        │  ← 30px bold timer
│           ● Running                       │  ← violet status
│  ┌────────────────────────────────────┐  │
│  │  Next: Hint 2        02:34         │  │  ← countdown chip
│  └────────────────────────────────────┘  │
│  [ Pause ]    [ Reset ]    [ Stop ]       │  ← 3 equal buttons
│                                           │
│  UNLOCK SCHEDULE                          │  ← uppercase label
│  🔒 Hint 1          ········  UNLOCKED   │
│  🔒 Hint 2          04:12   [unlock]     │
│  🔒 Hint 3          09:12   [unlock]     │
│  🔒 Solution        14:12   [unlock]     │
└──────────────────────────────────────────┘
```

- Pause → button becomes Resume (amber)
- Unlocked rows: checkmark + "UNLOCKED" in accent dim
- Click outside to close

---

## Screen 4 — Notes Split-Pane

Clicking the Notes button slides in a 380px sidebar from the right.
The main content area shrinks fluidly. The sidebar is sticky (stays in view while you scroll the problem).

```
┌─────────────────────────────────┐
│  NOTES                       ✕  │  ← header
│                                 │
│  ┌─────────────────────────┐   │
│  │ Write your notes here…  │   │  ← textarea (fills height)
│  │                         │   │
│  │                         │   │
│  └─────────────────────────┘   │
│  Saved ✓              247 chars │  ← footer
└─────────────────────────────────┘
```

- "Saved ✓" appears briefly in accent dim after autosave (debounced 400ms), then fades
- On mobile (<860px): notes pane becomes a full-screen overlay from the right edge

---

## Screen 5 — Sync States

Design as a small overlay system (no modals, no interruptions):

**Sync indicator in navbar:**
- Idle: nothing shown
- Syncing: small spinning ring (14px) near the logo, muted color
- Synced: brief green checkmark that fades after 2s

**Offline banner (top of page, 40px):**
`⚠ You're offline — changes saved locally and will sync when reconnected`
Amber background, dark text. Dismissible.

**Conflict toast (bottom-right, 280px):**
`Your note for "Gambler's Ruin" was updated from another device`
Dark card, subtle border, auto-dismiss after 4s.

---

## Screen 6 — Update Problems (Admin/Settings)

A settings panel (full page or modal) with a "Data" section:

**Current data:**
`833 problems  ·  Last updated 3 days ago  ·  Embedded in index.html`

**Upload new JSON:**
Drag-and-drop zone:
```
┌──────────────────────────────────────┐
│         ↑  Drop quantprof_           │
│           problems.json here         │
│         or click to browse           │
└──────────────────────────────────────┘
```

**After file is selected — preview card:**
```
✓ quantprof_problems.json parsed
  851 problems found  (↑ 18 new)

  By topic:
  probability     +6
  statistics      +4
  brainteasers    +5
  calculus        +3

  [ Cancel ]    [ Update & Deploy → ]
```

**Deploy progress states (sequential):**
1. `Parsing JSON…`
2. `Embedding into index.html…`
3. `Pushing to GitHub Pages…`
4. `✓ Live — site updated in 28s`

---

## Screen 7 — Mobile Views

**Mobile list (<860px):**
- Topic, Difficulty, Asked In, Bookmark columns hidden
- Only `#` | `Title` | `Status` remain
- Status pills wrap to second line
- Full-width search input

**Mobile detail:**
- Tab row wraps: tabs on left, action icons reflow below on a second line
- Notes pane is full-screen overlay with close button at top
- Focus popover narrows to fit screen width

---

## Keyboard Shortcuts (show in a help tooltip or /? overlay)

| Key | Action |
|---|---|
| `/` | Focus search |
| `Tab` | Toggle Problem ↔ Solution tab |
| `N` | Open/close Notes pane |
| `F` | Open/close Focus Mode popover |
| `← / h` | Previous problem |
| `→ / l` | Next problem |
| `Escape` | Close popover → close notes → back to list |

---

## Component Checklist for Figma

- [ ] Color styles (all tokens above)
- [ ] Text styles (28/700, 17/400, 15/500, 13/500, 11/500)
- [ ] Problem row (default, hover, solved, saved)
- [ ] Topic pill (one per topic color)
- [ ] Difficulty pill (easy/medium/hard)
- [ ] Company logo chip
- [ ] Bookmark icon (default, saved)
- [ ] Status icon (default, solved)
- [ ] Status pill (All/Saved/Unsolved, active/inactive)
- [ ] Tab switcher (Problem/Solution)
- [ ] Action icon button (default, hover, active)
- [ ] Collapsible card (collapsed, expanded, locked)
- [ ] Focus Mode popover (off, running, paused, all unlocked)
- [ ] Notes sidebar (empty, with content, saving)
- [ ] Sync indicator (idle, syncing, synced, offline)
- [ ] Offline banner
- [ ] Conflict toast
- [ ] JSON upload zone (empty, file selected, preview, deploying, done)
- [ ] Answer input + submit button + feedback states
- [ ] Mark-as-solved button (default, done)
- [ ] Pagination
