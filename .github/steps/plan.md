Below is a **“zero-external-runtime-deps” redesign** of the Task-Stack Manager.
Everything uses **only standards that ship with evergreen browsers** (Web Crypto, IndexedDB, ES Modules, Service Workers). The only optional build-time tool is a *single, pinned* copy of **esbuild** to squash files into one bundle; the compiled bundle is committed, so running or deploying the app never requires Node, NPM, CDNs, or package managers.

---

## 1  Principles for a dependency-free build

| Principle                         | Concrete rule                                                                                   | Pay-off                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Ship browser-native APIs**      | Crypto → `window.crypto.subtle`, Storage → IndexedDB, Drag & Drop → pointer events              | No polyfills, smaller surface for supply-chain vulns         |
| **No framework**                  | Hand-rolled components in vanilla TS/JS; templating via template literals tagged `html\` … \`\` | Zero runtime kilobytes; no React/Lit/Svelte updates to chase |
| **Single self-contained bundle**  | `dist/index.html` + `app.js` + `app.css`; all icons as inline SVG                               | Works from `file://`, USB stick, GitHub Pages, or S3         |
| **Vendored algorithms**           | Any third-party code ≤ 300 LOC (UUID generator, deflate) is copied into `/vendor/` with LICENSE | Removes npm install step                                     |
| **Immutable, reproducible build** | `tools/build.sh` runs `esbuild v0.22.1` (binary checked in)                                     | Future machines run the same compiler bit-for-bit            |
| **Fail-soft UX**                  | Feature-detect critical APIs and surface graceful errors                                        | Older browsers give an informative message, not a blank page |

---

## 2  Minimal tech stack

| Layer            | Choice                                                                   | Notes                                                                                  |
| ---------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| UI               | **Vanilla HTML + CSS (BEM)**, small helper `dom.js` for element creation | Native `<dialog>` for modals, `:has()` for CSS parent queries                          |
| State            | In-memory JS objects + **binary heap** util (60 LOC)                     | Heap is copied into `/vendor/heap.js`                                                  |
| Persistence      | **IndexedDB** via 30-line wrapper (`idb.ts`)                             | No idb-keyval, no Dexie                                                                |
| Crypto           | **AES-GCM + PBKDF2** through Web Crypto                                  | Roughly 40 LOC for derive/encrypt/decrypt                                              |
| Backup           | Export/import ciphertext as **downloadable Blob**                        | Also optional auto-backup to `navigator.storage.getDirectory()` on supporting browsers |
| Offline          | **Service Worker** hand-written in 50 LOC                                | Cache First strategy; version string in sw header                                      |
| Build (optional) | **esbuild** frozen binary in `/tools/esbuild/`                           | `npm` not required; `./build.sh` → `dist/`                                             |
| Tests            | Plain **`web-test-runner`** (runs in real browser)                       | No Jest/Vitest Node shim                                                               |

---

## 3  Folder structure

```
task-stack-manager/
├── src/
│   ├── index.html          # <script type="module" src="app.js">
│   ├── app.js              # bootstraps UI
│   ├── ui/                 # dom helpers, components
│   ├── core/               # queue.js, crypto.js, storage.js
│   └── sw.js               # service worker
├── vendor/                 # tiny standalone utilities
│   ├── heap.js
│   └── uuidv4.js
├── tools/
│   ├── esbuild/            # pinned binary → 6 MB
│   └── build.sh            # one-liner esbuild command
└── dist/                   # committed build artefacts (git-ignored *during* dev; committed before release)
```

---

## 4  Key implementation snippets (all standard APIs)

### 4.1 Priority queue (binary heap)

```js
// vendor/heap.js (excerpt, 60 LOC, MIT)
export class BinaryHeap {
  constructor(compare = (a, b) => a.priority > b.priority) {
    this.c = compare; this.h = [];
  }
  push(x) { /* …standard sift-up… */ }
  pop()  { /* …sift-down… */ }
}
```

### 4.2 Encryption round-trip

```js
// core/crypto.js
export async function deriveKey(pass, salt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(pass),
    { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encrypt(json, pass) {
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key  = await deriveKey(pass, salt);
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv },
             key, new TextEncoder().encode(json));
  return { v:"1.0", salt: [...salt], iv:[...iv], ct: Array.from(new Uint8Array(ct)) };
}
```

*All other code uses only `BinaryHeap`, `encrypt/decrypt`, and the tiny `idb.ts` wrapper.*

---

## 5  Handling the original SPOFs under zero-dep constraints

| SPOF                     | Zero-dep mitigation                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage loss**         | `navigator.storage.persist()` + reminder toast if quota isn’t persisted; one-click “Download backup” (pure Blob)                         |
| **Forgotten passphrase** | Self-generated *recovery key* (just 24 random words) offered at first run; printed or copied by user, never stored                       |
| **Crypto drift**         | Metadata `{v,algo,kdf}` embedded; future versions recognise and branch; old loaders shipped in `/migrations/` directory (stand-alone JS) |

---

## 6  Build & deploy procedure (entire project = 2 shell commands)

```bash
# 1. Build (optional – skip if you commit unbundled ES modules)
tools/build.sh            # calls esbuild to concat/minify into dist/app.js
# 2. Deploy (GitHub Pages)
git switch gh-pages && cp -r dist/* . && git commit -m "release" && git push
```

*You can also open `dist/index.html` straight from the filesystem for air-gapped use.*

---

## 7  Test matrix to ensure “environment-proofness”

1. **Browsers:** Chrome ≥ 90, Firefox ≥ 90, Safari ≥ 14, Edge ≥ 90 (all support AES-GCM, IndexedDB & ES Modules).
2. **Modes:** online, offline (Service Worker), incognito (expect quota prompt).
3. **CPU/Memory:** low-end devices verified via Chrome DevTools throttling.
4. **File URLs:** run `open dist/index.html`—app must load with no network.

A single HTML results file is generated by `web-test-runner` and committed for auditability.

---

### ✅ Outcome

* **Runtime footprint:** ≈ 12 kB JS + 3 kB CSS after gzip.
* **No external fetches:** works in flight-mode, behind firewalls, or from a USB stick.
* **No package manager, no CDN, no framework churn:** the code you ship is the code that runs—today, tomorrow, and (very likely) in five-year-old browsers.

Let me know if you’d like sample code for the drag-and-drop sorting, the IndexedDB wrapper, or a pre-filled repository scaffold you can clone and try immediately!
