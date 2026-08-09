# Browser Console Snippets

Run these in Brave DevTools (`Cmd+Option+I` → **Console**) while logged into
quantprof.org.

---

## 1. Get the problem index (`problem_index.json`)

Triggers a download of all 828 problems' metadata.

```javascript
(async () => {
    const dbName = 'firestore/[DEFAULT]/quantprof-backend-9cb17/main';
    const db = await new Promise(r => { const q = indexedDB.open(dbName); q.onsuccess = () => r(q.result); });
    const tx = db.transaction('remoteDocumentsV14', 'readonly').objectStore('remoteDocumentsV14').getAll();
    const all = await new Promise(r => { tx.onsuccess = () => r(tx.result); tx.onerror = () => r([]); });

    const fsVal = (v) => {
        if (!v) return v;
        if ('stringValue'    in v) return v.stringValue;
        if ('integerValue'   in v) return parseInt(v.integerValue);
        if ('doubleValue'    in v) return v.doubleValue;
        if ('booleanValue'   in v) return v.booleanValue;
        if ('nullValue'      in v) return null;
        if ('timestampValue' in v) return v.timestampValue;
        if ('arrayValue'     in v) return (v.arrayValue.values || []).map(fsVal);
        if ('mapValue'       in v) {
            const out = {};
            for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = fsVal(val);
            return out;
        }
        return v;
    };

    const problems = all
        .filter(d => d.collectionGroup === 'problem_index')
        .map(d => {
            const fields = d.document?.fields || {};
            const out = { _id: d.documentId };
            for (const [k, v] of Object.entries(fields)) out[k] = fsVal(v);
            return out;
        });

    console.log(`Extracted ${problems.length} problems`);

    const blob = new Blob([JSON.stringify(problems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'problem_index.json'; a.click();
    URL.revokeObjectURL(url);
})();
```

If you don't see all 828 problems, navigate around quantprof.org/problems
(scroll, change filters) to make sure the index loads, then re-run.

---

## 2. Get course + chapter names (`course_chapter_index.json`) — optional

Needed only if you want chapter names in the local site sidebar.

```javascript
(async () => {
    const dbName = 'firestore/[DEFAULT]/quantprof-backend-9cb17/main';
    const db = await new Promise(r => { const q = indexedDB.open(dbName); q.onsuccess = () => r(q.result); });
    const tx = db.transaction('remoteDocumentsV14', 'readonly').objectStore('remoteDocumentsV14').getAll();
    const all = await new Promise(r => { tx.onsuccess = () => r(tx.result); tx.onerror = () => r([]); });

    const fsVal = (v) => {
        if (!v) return v;
        if ('stringValue'    in v) return v.stringValue;
        if ('integerValue'   in v) return parseInt(v.integerValue);
        if ('doubleValue'    in v) return v.doubleValue;
        if ('booleanValue'   in v) return v.booleanValue;
        if ('timestampValue' in v) return v.timestampValue;
        if ('arrayValue'     in v) return (v.arrayValue.values || []).map(fsVal);
        if ('mapValue'       in v) {
            const out = {};
            for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = fsVal(val);
            return out;
        }
        return v;
    };

    const extract = (collGroup) => all
        .filter(d => d.collectionGroup === collGroup)
        .map(d => {
            const fields = d.document?.fields || {};
            const out = { _id: d.documentId };
            for (const [k, v] of Object.entries(fields)) out[k] = fsVal(v);
            return out;
        });

    const data = {
        courses:  extract('courses'),
        chapters: extract('chapters'),
    };
    console.log('Courses:',  data.courses.length);
    console.log('Chapters:', data.chapters.length);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'course_chapter_index.json'; a.click();
    URL.revokeObjectURL(url);
})();
```

---

## 3. Get ID token

The token expires in ~1 hour. **Reload the page first** (`Cmd+R`) to get
a fresh one — Firebase auto-refreshes on page load.

```javascript
(async () => {
    const db = await new Promise(r => { const q = indexedDB.open('firebaseLocalStorageDb'); q.onsuccess = () => r(q.result); });
    const tx = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').getAll();
    await new Promise(r => {
        tx.onsuccess = () => {
            for (const x of tx.result) {
                const t = x?.value?.stsTokenManager?.accessToken;
                if (t) {
                    console.log('%c=== TOKEN START ===', 'color:lime;font-weight:bold');
                    console.log(t);
                    console.log('%c=== TOKEN END ===',   'color:lime;font-weight:bold');
                }
            }
            r();
        };
        tx.onerror = () => r();
    });
})();
```

Triple-click the token line to select it, then `Cmd+C`.

Prefer putting it in an env var (do **not** write the JWT into synced files):

```bash
export QUANTPROF_ID_TOKEN='paste-token-here'
```

Or temporarily paste into `ID_TOKEN = "..."` in `quantprof_scraper.py`, then
clear it after the scrape.
