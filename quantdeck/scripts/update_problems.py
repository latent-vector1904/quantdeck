#!/usr/bin/env python3
"""
Update QuantDeck problems.

Usage:
    python3 scripts/update_problems.py
    python3 scripts/update_problems.py path/to/quantprof_problems.json

Reads the scraped JSON, slims it, writes to public/problems.json,
commits and pushes — GitHub Actions redeploys automatically.
"""

import json, os, sys, subprocess

HERE      = os.path.dirname(os.path.abspath(__file__))
ROOT      = os.path.dirname(HERE)
PUBLIC    = os.path.join(ROOT, 'public', 'problems.json')
# Prefer share-layout paths, then legacy layout
_CANDIDATES = [
    os.path.join(ROOT, '..', 'questions', 'quantprof_problems.json'),
    os.path.join(ROOT, '..', 'toolkit', '1_scraper', 'quantprof_problems.json'),
    os.path.join(ROOT, '..', 'quantprof_toolkit', '1_scraper', 'quantprof_problems.json'),
]
DEFAULT_IN = next((os.path.abspath(p) for p in _CANDIDATES if os.path.exists(p)),
                  os.path.abspath(_CANDIDATES[0]))

KEEP = {
    '_id','title','level','topic','askedIn','type','isPrivate',
    'question','answer',
    'hint1','hint2','hint3','hint4','hint5',
    'solution','solution2','solution3',
    'courseId','chapterId','order',
    'normalisedTitle','normalizedTitle',
}

def slim(p):
    return {k: v for k, v in p.items() if k in KEEP}

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    if not os.path.exists(src):
        print(f'[!] File not found: {src}')
        sys.exit(1)

    with open(src, encoding='utf-8') as f:
        raw = json.load(f)

    problems = raw.get('problems', raw) if isinstance(raw, dict) else raw
    questions = [slim(p) for p in problems if p.get('type') == 'question']
    questions.sort(key=lambda p: int(p.get('order') or 9999))
    print(f'[*] {len(questions)} questions')

    payload = json.dumps({'problems': questions}, ensure_ascii=False, separators=(',', ':'))
    with open(PUBLIC, 'w', encoding='utf-8') as f:
        f.write(payload)

    size_mb = os.path.getsize(PUBLIC) / 1024 / 1024
    print(f'[+] public/problems.json updated ({size_mb:.1f} MB)')

    # Opt-in git push (default off — Syncthing share may have no remote)
    if '--push' in sys.argv:
        run = lambda cmd: subprocess.run(cmd, cwd=ROOT, check=True)
        run(['git', 'add', 'public/problems.json'])
        run(['git', 'commit', '-m', f'Update problems data ({len(questions)} questions)'])
        run(['git', 'push', 'origin', 'main'])
        print('[+] Pushed — GitHub Actions will redeploy in ~1 min')
    else:
        print('[*] Skipped git push (pass --push if you want that)')

if __name__ == '__main__':
    main()
