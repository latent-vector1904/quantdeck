#!/usr/bin/env python3
"""
Generate a LaTeX workbook from quantprof_problems.json.

Output:
    quantprof_workbook.tex
    workbook_images/             (downloaded images)

Compile:
    pdflatex quantprof_workbook.tex
    pdflatex quantprof_workbook.tex     # twice, for page numbers

Structure (single combined document):
    Compact header at the top of page 1
    All problems  (numbered, with title + question only)
    Page break
    All hints + solutions  (per problem: hints, then solution, then answer)
"""

import hashlib
import json
import os
import re
import sys

import requests

try:
    from PIL import Image
    PIL_OK = True
except ImportError:
    PIL_OK = False

INPUT      = "quantprof_problems.json"
OUTPUT_TEX = "quantprof_workbook.tex"
SHEET_SIZE = 15   # problems per Q+Sol block
IMG_DIR    = "workbook_images"


# ── LaTeX conversion ─────────────────────────────────────────────────────────

def escape_latex_text(t: str) -> str:
    """Escape special LaTeX chars in plain (non-math, non-image) text."""
    t = t.replace("\\", r"\textbackslash{}")
    repl = {
        "&": r"\&", "%": r"\%", "#": r"\#", "_": r"\_",
        "{": r"\{", "}": r"\}",
        "$": r"\$",
        "~": r"\textasciitilde{}", "^": r"\textasciicircum{}",
        # Unicode chars pdflatex can't handle natively
        "\u25cf": r"\textbullet{}",   # ●
        "\u2022": r"\textbullet{}",   # •
        "\u25e6": r"\circ{}",         # ◦
        "\ufffd": "",                   # replacement char
        "\u2013": "--",                 # en-dash
        "\u2014": "---",                # em-dash
        "\u2018": "`",                  # left single quote
        "\u2019": "'",                  # right single quote
        "\u201c": "``",                 # left double quote
        "\u201d": "''",                 # right double quote
        "\u2026": "...",                # ellipsis
        "\u00d7": r"\texttimes{}",    # ×
        "\u00b1": r"\textpm{}",       # ±
        "\u2212": "-",                   # − (unicode minus)
    }
    for k, v in repl.items():
        t = t.replace(k, v)
    return t


# Control-char placeholders that won't be touched by escape_latex_text
IMG_OPEN, IMG_CLOSE  = "\x01", "\x02"
MATH_OPEN, MATH_CLOSE = "\x03", "\x04"


def to_latex(content: str, image_map: dict) -> str:
    if not content:
        return ""

    # Protect already-escaped dollar signs (\$500 style currency in source data)
    # before any processing so we don't double-escape them.
    DOLLAR_PLACEHOLDER = "\x05DOLLAR\x06"
    content = content.replace("\\$", DOLLAR_PLACEHOLDER)

    # Disambiguate $text$$$display$$ — split $$$ into "$ $$"
    content = re.sub(r'(?<!\$)\$\$\$(?!\$)', '$ $$', content)



    # 1) Pull <img> tags out, replace with image-slot placeholders.
    images = []
    def img_sub(m):
        url = m.group(1)
        local = image_map.get(url)
        if not local:
            return ""
        idx = len(images)
        images.append(
            "\n\n\\begin{center}\n"
            f"  \\includegraphics[width=0.7\\textwidth, keepaspectratio]{{{local}}}\n"
            "\\end{center}\n\n"
        )
        return f"{IMG_OPEN}{idx}{IMG_CLOSE}"
    content = re.sub(r'<img\s+[^>]*src="([^"]+)"[^>]*>', img_sub, content,
                     flags=re.IGNORECASE)


    # 2) Extract math BEFORE stripping HTML -- keeps < > in math safe.
    # 3) Pull math regions ($$..$$ and $..$) out, replace with math-slot placeholders.
    #    Order matters: $$..$$ must be replaced first (they'd be eaten by the
    #    single-$ pattern otherwise).
    maths = []
    def math_sub(m):
        idx = len(maths)
        # % is a comment character in LaTeX even inside math — must escape it
        math_str = re.sub(r'(?<!\\)%', r'\\%', m.group(0))  # only escape bare %, not \%
        math_str = math_str.replace("\u2212", "-")  # Unicode minus → ASCII
        maths.append(math_str)
        return f"{MATH_OPEN}{idx}{MATH_CLOSE}"

    content = re.sub(r"\$\$.+?\$\$", math_sub, content, flags=re.DOTALL)
    content = re.sub(r"\$[^\x03$]{1,400}\$", math_sub, content)

    # 3) Strip HTML -- math is now safely in placeholders.
    content = re.sub(r"<[^>]+>", "", content)


    # 4) Escape what's left (any stray $ or special chars are now safely escaped).
    content = escape_latex_text(content)

    # 5) Restore math, then images.
    for i, m in enumerate(maths):
        content = content.replace(f"{MATH_OPEN}{i}{MATH_CLOSE}", m)
    for i, img in enumerate(images):
        content = content.replace(f"{IMG_OPEN}{i}{IMG_CLOSE}", img)

    # Restore pre-escaped dollars
    content = content.replace(DOLLAR_PLACEHOLDER, r"\$")

    # 6) Tidy paragraph breaks.
    content = re.sub(r"\n{2,}", "\n\n", content)
    return content.strip()


# ── Image handling ──────────────────────────────────────────────────────────

def find_image_urls(problems) -> set:
    urls = set()
    pat  = re.compile(r'<img\s+[^>]*src="([^"]+)"', re.IGNORECASE)
    fields = ("question", "solution", "solution2", "solution3",
              "hint1", "hint2", "hint3", "hint4", "hint5")
    for p in problems:
        for f in fields:
            v = p.get(f)
            if v:
                urls.update(pat.findall(v))
    return urls


def download_images(urls: set) -> dict:
    os.makedirs(IMG_DIR, exist_ok=True)
    mapping = {}
    n = len(urls)

    for i, url in enumerate(sorted(urls), 1):
        h   = hashlib.md5(url.encode()).hexdigest()[:12]
        ext = ".bin"
        for e in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".svg"):
            if e in url.lower():
                ext = e
                break

        local_name = f"{h}{ext}"
        local_path = os.path.join(IMG_DIR, local_name)

        if os.path.exists(local_path):
            mapping[url] = _post_process(local_path, local_name)
            continue

        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(r.content)
                final = _post_process(local_path, local_name)
                if final:
                    mapping[url] = final
                    print(f"  [{i}/{n}] {final}")
                else:
                    print(f"  [{i}/{n}] skipped (unusable) {url[:70]}")
            else:
                print(f"  [{i}/{n}] HTTP {r.status_code} for {url[:70]}")
        except Exception as e:
            print(f"  [{i}/{n}] error: {e}")

    return mapping


def _post_process(path: str, name: str):
    ext = os.path.splitext(name)[1].lower()
    if ext in (".png", ".jpg", ".jpeg", ".pdf"):
        return os.path.join(IMG_DIR, name)
    if ext in (".webp", ".gif") and PIL_OK:
        try:
            img      = Image.open(path).convert("RGBA")
            png_name = name.rsplit(".", 1)[0] + ".png"
            png_path = os.path.join(IMG_DIR, png_name)
            img.save(png_path, "PNG")
            return os.path.join(IMG_DIR, png_name)
        except Exception:
            return None
    if ext == ".svg":
        return None
    return os.path.join(IMG_DIR, name)


# ── Document template ───────────────────────────────────────────────────────

PREAMBLE = r"""\documentclass[11pt]{article}

\usepackage[a4paper, margin=0.9in]{geometry}
\usepackage{amsmath, amssymb, amsthm}
\usepackage{graphicx}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage[hidelinks]{hyperref}

\titlespacing*{\section}{0pt}{0.4em}{0.6em}
\titlespacing*{\subsection}{0pt}{1.2em}{0.5em}

\setlength{\parindent}{0pt}
\setlength{\parskip}{0.6em}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\itshape QuantProf Workbook}
\fancyhead[R]{\small\thepage}
\renewcommand{\headrulewidth}{0.4pt}

\begin{document}

% Compact header -- no title page
{\Large\bfseries QuantProf Workbook}\par
\vspace{0.2em}
{\small\itshape 15 problems per block — questions first, then solutions.}\par
\vspace{1.4em}

"""

PROBLEMS_HEADER = r"""\section*{Problems}

"""

SOLUTIONS_HEADER = r"""\newpage
\section*{Hints \& Solutions}

"""

POSTAMBLE = r"\end{document}" + "\n"


# ── Builder ─────────────────────────────────────────────────────────────────

def problem_block(i, p, image_map):
    """Render one problem (question only)."""
    q     = to_latex(p.get("question", ""), image_map)
    title = to_latex(p.get("title", ""), image_map)
    head  = f"Problem {i}" + (f": {title}" if title else "")
    return f"\\subsection*{{{head}}}\n" + q + "\n\n"


def solution_block(i, p, image_map):
    """Render one solution (hints + solution + answer)."""
    title    = to_latex(p.get("title", ""), image_map)
    sol_head = f"Solution to Problem {i}" + (f": {title}" if title else "")
    out      = [f"\\subsection*{{{sol_head}}}\n"]

    hints = [p.get(f"hint{k}") for k in range(1, 6)]
    hints = [h for h in hints if h and h.strip()]
    for hi, h in enumerate(hints, 1):
        out.append(f"\\textbf{{Hint {hi}.}} {to_latex(h, image_map)}\n\n")

    sols = [p.get(k) for k in ("solution", "solution2", "solution3")]
    sols = [s for s in sols if s and s.strip()]
    for si, s in enumerate(sols, 1):
        label = "Solution" if len(sols) == 1 else f"Solution {si}"
        out.append(f"\\textbf{{{label}.}} {to_latex(s, image_map)}\n\n")

    ans = p.get("answer")
    if ans:
        out.append(f"\\textit{{Answer: {to_latex(str(ans), image_map)}}}\n\n")

    return "".join(out)


def build_document(problems, image_map) -> str:
    """Interleaved structure: Questions 1-15, Solutions 1-15, Questions 16-30, ..."""
    out     = [PREAMBLE]
    chunks  = [problems[i:i + SHEET_SIZE] for i in range(0, len(problems), SHEET_SIZE)]
    total   = len(chunks)

    for sheet_num, chunk in enumerate(chunks, 1):
        start = (sheet_num - 1) * SHEET_SIZE + 1
        end   = start + len(chunk) - 1

        # ── Questions block ───────────────────────────────────────────────
        if sheet_num == 1:
            out.append(f"\\section*{{Sheet {sheet_num}/{total} \\quad Problems {start}\\textendash{{}}{end}}}")
        else:
            out.append(f"\\newpage\n\\section*{{Sheet {sheet_num}/{total} \\quad Problems {start}\\textendash{{}}{end}}}")
        out.append("\n\n")

        for local_i, (global_i, p) in enumerate(zip(range(start, end + 1), chunk), 1):
            out.append(problem_block(local_i, p, image_map))

        # ── Solutions block ───────────────────────────────────────────────
        out.append(f"\\newpage\n\\section*{{Sheet {sheet_num}/{total} \\quad Solutions {start}\\textendash{{}}{end}}}")
        out.append("\n\n")

        for local_i, (global_i, p) in enumerate(zip(range(start, end + 1), chunk), 1):
            out.append(solution_block(local_i, p, image_map))

    out.append(POSTAMBLE)
    return "".join(out)


def main():
    if not os.path.exists(INPUT):
        print(f"[!] {INPUT} not found.")
        sys.exit(1)

    with open(INPUT) as f:
        raw = json.load(f)
    problems = raw.get("problems", raw) if isinstance(raw, dict) else raw
    problems = [p for p in problems if p.get("type") == "question"]

    # Match website ordering: order field is a global 1–828 sequential index
    problems.sort(key=lambda p: int(p.get("order") or 9999))

    print(f"[*] {len(problems)} problems")
    if not PIL_OK:
        print("[*] Pillow not installed -- webp images will be skipped.")

    print(f"[*] Scanning for images...")
    urls = find_image_urls(problems)
    print(f"[*] Found {len(urls)} unique image URLs")
    image_map = download_images(urls)
    print(f"[*] {len(image_map)} images usable")

    tex = build_document(problems, image_map)
    with open(OUTPUT_TEX, "w", encoding="utf-8") as f:
        f.write(tex)

    print(f"\n[+] Wrote {OUTPUT_TEX}")
    print(f"[+] Compile: pdflatex {OUTPUT_TEX}    (run twice for page numbers)")


if __name__ == "__main__":
    main()
