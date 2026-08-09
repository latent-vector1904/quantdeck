#!/usr/bin/env python3
"""
After a fresh scrape, copy/slim questions into every place this share expects them.

Usage (from share root):
    python3 scripts/refresh_questions.py
    python3 scripts/refresh_questions.py path/to/quantprof_problems.json

Does NOT git commit/push. Does NOT touch credentials.
Optionally rebuilds standalone HTML if toolkit/2_local_site is present.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DEFAULT_SRC = os.path.join(ROOT, "toolkit", "1_scraper", "quantprof_problems.json")

KEEP = {
    "_id", "title", "level", "topic", "askedIn", "type", "isPrivate",
    "question", "answer",
    "hint1", "hint2", "hint3", "hint4", "hint5",
    "solution", "solution2", "solution3",
    "courseId", "chapterId", "order",
    "normalisedTitle", "normalizedTitle",
}

FULL_DESTS = [
    os.path.join(ROOT, "questions", "quantprof_problems.json"),
    os.path.join(ROOT, "toolkit", "1_scraper", "quantprof_problems.json"),
    os.path.join(ROOT, "toolkit", "2_local_site", "quantprof_problems.json"),
    os.path.join(ROOT, "toolkit", "3_workbook", "quantprof_problems.json"),
]

SLIM_DESTS = [
    os.path.join(ROOT, "questions", "problems.json"),
    os.path.join(ROOT, "quantdeck", "public", "problems.json"),
]


def slim(p: dict) -> dict:
    return {k: v for k, v in p.items() if k in KEEP}


def load_raw(path: str):
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    problems = raw.get("problems", raw) if isinstance(raw, dict) else raw
    if not isinstance(problems, list):
        raise SystemExit(f"[!] Unexpected JSON shape in {path}")
    if not isinstance(raw, dict) or "problems" not in raw:
        raw = {"problems": problems, "count": len(problems)}
    return raw, problems


def write_json(path: str, obj) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    mb = os.path.getsize(path) / 1024 / 1024
    print(f"[+] {os.path.relpath(path, ROOT)} ({mb:.1f} MB)")


def main() -> None:
    src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC)
    if not os.path.exists(src):
        print(f"[!] Scraped JSON not found: {src}")
        print("    Run toolkit/1_scraper first, or pass a path.")
        sys.exit(1)

    full_raw, problems = load_raw(src)
    questions = [slim(p) for p in problems if p.get("type") == "question"]
    questions.sort(key=lambda p: int(p.get("order") or 9999))
    print(f"[*] {len(problems)} records, {len(questions)} questions from {src}")

    for dest in FULL_DESTS:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.abspath(dest) == src:
            print(f"[=] {os.path.relpath(dest, ROOT)} (source)")
            continue
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(full_raw, f, ensure_ascii=False)
        mb = os.path.getsize(dest) / 1024 / 1024
        print(f"[+] {os.path.relpath(dest, ROOT)} ({mb:.1f} MB)")

    slim_payload = {"problems": questions}
    for dest in SLIM_DESTS:
        write_json(dest, slim_payload)

    site_dir = os.path.join(ROOT, "toolkit", "2_local_site")
    build = os.path.join(site_dir, "build_site.py")
    if os.path.exists(build):
        print("[*] Rebuilding standalone HTML…")
        subprocess.run([sys.executable, "build_site.py"], cwd=site_dir, check=True)
        built = os.path.join(site_dir, "quantprof_local.html")
        if os.path.exists(built):
            os.makedirs(os.path.join(ROOT, "standalone"), exist_ok=True)
            for name in ("quantdeck_local.html", "quantdeck.html"):
                out = os.path.join(ROOT, "standalone", name)
                shutil.copy2(built, out)
                print(f"[+] standalone/{name}")

    print("[*] Done. Syncthing will pick up the updated question files.")
    print("[!] Do not leave QUANTPROF_ID_TOKEN / JWTs in this folder.")


if __name__ == "__main__":
    main()
