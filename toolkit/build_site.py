#!/usr/bin/env python3
"""
Build the local QuantProf clone by injecting scraped data into the HTML template.

Usage:
    python3 build_site.py

Reads:  quantprof_problems.json  (from the scraper)
        template.html
Writes: quantprof_local.html     (single self-contained file you can open directly)
"""

import json
import os
import sys

INPUT    = "quantprof_problems.json"
TEMPLATE = "template.html"
OUTPUT   = "quantprof_local.html"

# Fields we want to keep — drops noisy stuff we don't need on the frontend.
KEEP = {
    "_id", "title", "level", "topic", "askedIn", "type", "isPrivate",
    "question", "answer",
    "hint1", "hint2", "hint3", "hint4", "hint5",
    "solution", "solution2", "solution3",
    "courseId", "chapterId", "order",
    "normalisedTitle", "normalizedTitle",
}


def slim(p):
    return {k: v for k, v in p.items() if k in KEEP}


def main():
    if not os.path.exists(INPUT):
        print(f"[!] {INPUT} not found. Run the scraper first.")
        sys.exit(1)
    if not os.path.exists(TEMPLATE):
        print(f"[!] {TEMPLATE} not found. Place template.html next to this script.")
        sys.exit(1)

    with open(INPUT) as f:
        raw = json.load(f)
    problems = raw.get("problems", raw) if isinstance(raw, dict) else raw

    # Filter to actual question entries, slim down each one
    questions = [slim(p) for p in problems if p.get("type") == "question"]

    # Sort by global order field (1–828), which is the website's ordering
    questions.sort(key=lambda p: int(p.get("order") or 9999))

    # Optional: load course + chapter names if course_chapter_index.json exists
    courses_map  = {}
    chapters_map = {}
    if os.path.exists("course_chapter_index.json"):
        with open("course_chapter_index.json") as f:
            cci = json.load(f)
        courses_map  = {c["_id"]: c.get("title") or c.get("name") for c in cci.get("courses", [])}
        chapters_map = {c["_id"]: c.get("title") or c.get("name") for c in cci.get("chapters", [])}
        print(f"[*] Loaded names for {len(courses_map)} courses, {len(chapters_map)} chapters")
        for q in questions:
            q["courseName"]  = courses_map.get(q.get("courseId"), "")
            q["chapterName"] = chapters_map.get(q.get("chapterId"), "")

    print(f"[*] {len(questions)} questions (out of {len(problems)} entries)")

    payload = json.dumps({"problems": questions}, ensure_ascii=False, separators=(",", ":"))

    with open(TEMPLATE) as f:
        template = f.read()

    # Inject — the JSON is inside a <script type="application/json"> so the
    # only character we have to escape is </script> closing tags inside strings.
    safe = payload.replace("</", "<\\/")
    site = template.replace("__DATA__", safe)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(site)

    size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
    print(f"[+] Built {OUTPUT} ({size_mb:.1f} MB)")
    print(f"[+] Open it: open {OUTPUT}     (or just double-click)")


if __name__ == "__main__":
    main()
