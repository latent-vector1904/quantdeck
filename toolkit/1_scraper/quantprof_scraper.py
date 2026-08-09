#!/usr/bin/env python3
"""
QuantProf scraper — uses problem_index.json (extracted from browser IndexedDB)
+ Firestore REST API to fetch full problem content.

WORKFLOW:
1. Run the console snippet to download problem_index.json (740 problems, metadata only).
2. Place problem_index.json next to this script.
3. Get a fresh Firebase ID token from the console (see below) and paste it as ID_TOKEN.
4. Run: python3 quantprof_scraper.py

Token-grabber (paste in DevTools console at quantprof.org):

(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('firebaseLocalStorageDb');q.onsuccess=()=>r(q.result)});const tx=db.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();await new Promise(r=>{tx.onsuccess=()=>{for(const x of tx.result){const t=x?.value?.stsTokenManager?.accessToken;if(t){console.log('=== TOKEN ===');console.log(t);console.log('=== END ===')}}r()}})})();
"""

import json
import os
import sys
import time
import requests
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────────────────
ID_TOKEN  = os.environ.get("QUANTPROF_ID_TOKEN", "PASTE_YOUR_TOKEN_HERE")
INDEX     = "problem_index.json"
OUTPUT    = "quantprof_problems.json"
TEST_MODE = False   # True = first 5 problems. Set False for all 740.
PAUSE     = 0.1    # seconds between API calls (be polite)
# ───────────────────────────────────────────────────────────────────────────

FIREBASE_PROJECT_ID = "quantprof-backend-9cb17"

# Try multiple collection names since we don't know exactly where full
# problem content lives. The first one that returns data wins.
PROBLEM_COLLECTIONS = ["topics", "problems", "problem"]
SUBCOLLECTIONS      = ["hints", "solution", "solutions"]


def fs_value(v):
    if "stringValue"    in v: return v["stringValue"]
    if "integerValue"   in v: return int(v["integerValue"])
    if "doubleValue"    in v: return float(v["doubleValue"])
    if "booleanValue"   in v: return v["booleanValue"]
    if "nullValue"      in v: return None
    if "timestampValue" in v: return v["timestampValue"]
    if "referenceValue" in v: return v["referenceValue"]
    if "arrayValue"     in v: return [fs_value(i) for i in v["arrayValue"].get("values", [])]
    if "mapValue"       in v: return {k: fs_value(val) for k, val in v["mapValue"].get("fields", {}).items()}
    return v


def doc_to_dict(doc):
    if not doc or "fields" not in doc:
        return None
    data = {k: fs_value(v) for k, v in doc["fields"].items()}
    data["_id"]      = doc.get("name", "").split("/")[-1]
    data["_created"] = doc.get("createTime")
    data["_updated"] = doc.get("updateTime")
    return data


class TokenExpired(Exception):
    pass


def fs_get(path):
    base    = (f"https://firestore.googleapis.com/v1/projects/"
               f"{FIREBASE_PROJECT_ID}/databases/(default)/documents")
    headers = {"Authorization": f"Bearer {ID_TOKEN}"}
    resp    = requests.get(f"{base}/{path}", headers=headers)
    if resp.status_code == 401:
        raise TokenExpired()
    if resp.status_code == 404:
        return None
    if resp.status_code == 403:
        return "FORBIDDEN"
    if resp.status_code != 200:
        return None
    return resp.json()


def discover_problem_collection(sample_id):
    """Try each candidate collection to find which one holds full problem content."""
    print(f"[*] Discovering full-content collection (testing IDs against {len(PROBLEM_COLLECTIONS)} candidates)...")
    for coll in PROBLEM_COLLECTIONS:
        result = fs_get(f"{coll}/{sample_id}")
        if result and result != "FORBIDDEN":
            print(f"    [+] Found! Collection = '{coll}'")
            return coll
        else:
            print(f"    [-] '{coll}' -> {result if result else '404'}")
    return None


def fetch_full_problem(collection, problem_id):
    # Hints (hint1..hint5) and solutions (solution, solution2, solution3) are
    # inline fields on the main doc, NOT subcollections — single GET is enough.
    doc  = fs_get(f"{collection}/{problem_id}")
    return doc_to_dict(doc) if doc and doc != "FORBIDDEN" else {}


SAVE_EVERY = 25   # flush partial JSON to disk every N problems


def save_output(enriched, collection):
    output = {
        "scraped_at":  datetime.utcnow().isoformat() + "Z",
        "collection":  collection,
        "total":       len(enriched),
        "problems":    enriched,
    }
    # Write atomically via .tmp swap
    tmp = OUTPUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    os.replace(tmp, OUTPUT)


def main():
    print("=" * 60)
    print("  QuantProf Scraper (resumable)")
    print("=" * 60)

    if ID_TOKEN == "PASTE_YOUR_TOKEN_HERE" or not ID_TOKEN:
        print("[!] Paste your Firebase ID token into ID_TOKEN at the top of the script.")
        sys.exit(1)

    if not os.path.exists(INDEX):
        print(f"[!] Cannot find {INDEX}. Run the console snippet to download it first.")
        sys.exit(1)

    with open(INDEX) as f:
        index = json.load(f)
    print(f"[+] Loaded {len(index)} problems from {INDEX}")

    if TEST_MODE:
        index = index[:5]
        print(f"[*] TEST MODE - using only first {len(index)} problems")

    # Resume: if OUTPUT already exists, load completed problems and skip them
    enriched = []
    done_ids = set()
    if os.path.exists(OUTPUT):
        try:
            with open(OUTPUT) as f:
                prev = json.load(f)
            enriched = prev.get("problems", [])
            done_ids = {p.get("_id") for p in enriched}
            print(f"[+] Resume: found {len(done_ids)} already-fetched problems in {OUTPUT}")
        except Exception as e:
            print(f"[!] Could not parse existing {OUTPUT}: {e} -- starting fresh")
            enriched = []
            done_ids = set()

    # Filter out what's already done
    todo = [p for p in index if p["_id"] not in done_ids]
    if not todo:
        print(f"[+] Nothing left to do -- all {len(index)} problems already scraped.")
        return

    print(f"[*] {len(todo)} problems remaining")

    # Step 1: discover collection (using a problem that hasn't been done yet)
    collection = discover_problem_collection(todo[0]["_id"])
    if not collection:
        print("[!] Could not find a readable collection for full problem content.")
        # Still save metadata-only fallback
        save_output([{**p} for p in index], "metadata_only")
        return

    # Step 2: fetch with incremental saves and graceful token-expiry handling
    print(f"\n[*] Fetching full content for {len(todo)} problems...")
    try:
        for i, p in enumerate(todo, 1):
            pid    = p["_id"]
            try:
                full = fetch_full_problem(collection, pid)
            except TokenExpired:
                print(f"\n[!] Token expired at problem {i}/{len(todo)}.")
                print(f"[+] Saving progress: {len(enriched)} problems done so far -> {OUTPUT}")
                save_output(enriched, collection)
                print("[!] Get a fresh token, paste into ID_TOKEN, and re-run.")
                print("    The script will resume from where it stopped.")
                sys.exit(2)

            merged = {**p, **full}
            enriched.append(merged)
            title  = merged.get("title", "?")[:50]
            print(f"    [{i}/{len(todo)}] (total {len(enriched)}/{len(index)}) {pid} - {title}")

            if i % SAVE_EVERY == 0:
                save_output(enriched, collection)

            time.sleep(PAUSE)
    except KeyboardInterrupt:
        print(f"\n[!] Interrupted. Saving {len(enriched)} done so far -> {OUTPUT}")
        save_output(enriched, collection)
        sys.exit(130)

    save_output(enriched, collection)
    print(f"\n[+] Done! {len(enriched)} problems -> {OUTPUT}")


if __name__ == "__main__":
    main()
