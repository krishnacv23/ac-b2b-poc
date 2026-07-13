# Enabling Universal Editor (DA + Author Bus)

This guide documents how Universal Editor (UE) was enabled for **ac-b2b-poc**, so you can repeat the same setup on other Edge Delivery + Document Authoring (DA) projects.

**Authoring path:** Document Authoring (da.live) content + Universal Editor canvas on Author Bus (`*.ue.da.live`).

**Official docs:**

- [Enable your project for Universal Editor](https://docs.da.live/developers/reference/universal-editor)
- [Setup Universal Editor](https://docs.da.live/administrators/guides/setup-universal-editor)
- [DA configs](https://docs.da.live/administrators/guides/configs)

---

## Architecture (what talks to what)

```text
da.live (content)
    │
    │  editor.path routes authors to UE
    ▼
experience.adobe.com/#/@{dxHandle}/aem/editor/canvas/{branch}--{repo}--{owner}.ue.da.live
    │
    │  loads site code + component-*.json
    ▼
Your GitHub repo (blocks, scripts/ue.js, component-definition/models/filters.json)
```

| Piece | Role |
|-------|------|
| **DA site** | Stores authored pages (Author Bus) |
| **DX handle** | Adobe org slug in Experience Cloud URLs (e.g. `@echidnaptrsd`) |
| **UE canvas host** | `{branch}--{repo}--{owner}.ue.da.live` — preview of your code for in-context editing |
| **`component-*.json`** | Tells UE which blocks exist, their fields, and what can be added to sections |
| **`scripts/ue.js`** | Runtime helpers so decorated blocks keep UE instrumentation (`data-aue-*`) |

---

## Prerequisites (every new project)

Before configuring anything, confirm all of these:

1. **DX handle** — From `https://experience.adobe.com/#/@{handle}/home`  
   Example for this project: `@echidnaptrsd`
2. **Universal Editor entitlements** — IMS org has UE / AEM Sites credits (Early Access for DA + UE)
3. **DA org + site** — e.g. `https://da.live/#/{org}/{site}`  
   Example: `https://da.live/#/krishnacv23/ac-b2b-poc`
4. **GitHub repo connected to EDS** — AEM Code Sync serving `{branch}--{repo}--{owner}.aem.page` / `.ue.da.live`
5. **Browser** — Chrome or Safari (per DA UE docs)

### Confirm UE is available for your org

Open (adjust branch/repo/owner):

```text
https://experience.adobe.com/#/@{dxHandle}/aem/editor/canvas/main--{repo}--{owner}.ue.da.live/
```

This project’s confirmation URL:

```text
https://experience.adobe.com/#/@echidnaptrsd/aem/editor/canvas/main--ac-b2b-poc--krishnacv23.ue.da.live/
```

- Canvas loads → UE is enabled for that DX handle  
- Access denied / product missing → contact Adobe; UE is not entitled for the org

---

## Part A — Code instrumentation (in the Git repo)

Adobe Commerce / AEM boilerplate projects often already include most of this. Treat the list as a checklist.

### A1. Root UE JSON files (required)

At the **repository root** you must have:

| File | Purpose |
|------|---------|
| `component-definition.json` | Blocks UE can insert (id, title, DA plugin type) |
| `component-models.json` | Property panel fields per block |
| `component-filters.json` | What can be added under `main` / `section` / nested containers |

**Do not maintain these by hand long-term.** Generate them.

In this boilerplate:

```bash
npm run build:json
```

That merges:

- `models/_component-definition.json`, `_component-models.json`, `_component-filters.json`
- Per-block files: `blocks/{blockname}/_{blockname}.json`
- Shared models: `models/_section.json`, `_text.json`, `_image.json`, `_page.json`, …

A pre-commit hook often runs `build:json` automatically.

### A2. Runtime UE scripts (required)

| File | Purpose |
|------|---------|
| `scripts/ue.js` | Mutation observers + `aue:*` event handlers |
| `scripts/ue-utils.js` | Moves `data-aue-*` attributes after DOM decoration |
| `scripts/commerce.js` | `IS_UE = hostname.includes('ue.da.live')` |
| `scripts/scripts.js` | Loads `ue.js` when `IS_UE` is true |

Pattern:

```js
if (IS_UE) {
  await import(`${window.hlx.codeBasePath}/scripts/ue.js`).then(({ default: ue }) => ue());
}
```

Without this, block decoration can strip UE attributes and the canvas becomes unusable.

### A3. Block models (per custom block)

Each block that should be authorable in UE needs `blocks/{name}/_{name}.json` with at least:

- **definitions** — `id`, `title`, `model`, and `plugins.da` (e.g. `type: "key-value-block"` for config-style blocks)
- **models** — field list (`text`, `number`, `richtext`, `reference`, …)
- **filters** — usually `[]` for simple blocks; used for container blocks (accordion items, etc.)

Example (key-value commerce block):

```json
{
  "definitions": [{
    "title": "Commerce Custom Product List",
    "id": "commerce-custom-product-list",
    "model": "commerce-custom-product-list",
    "plugins": {
      "da": { "type": "key-value-block" }
    }
  }],
  "models": [{
    "id": "commerce-custom-product-list",
    "fields": [
      { "component": "text", "name": "title", "label": "Title" },
      { "component": "number", "name": "pageSize", "label": "Page Size", "value": 12 }
    ]
  }],
  "filters": []
}
```

Block types (from DA docs):

| Type | When to use | DA plugin hint |
|------|-------------|----------------|
| Simple | Fixed fields (hero) | `rows` / `columns` + `fields` selectors |
| Container | Repeatable children (accordion) | parent + child definition + `filters` |
| Key-value | Config blocks (`readBlockConfig`) | `"type": "key-value-block"` |

### A4. Register the block in the section filter (easy to miss)

Even with a block JSON file, UE will **not** show it under “+” unless the section filter lists its id.

Edit `models/_section.json` → `filters` → `id: "section"` → `components` array:

```json
"commerce-custom-product-list"
```

Then run:

```bash
npm run build:json
```

Confirm it appears in root `component-filters.json`.

### A5. Push to GitHub

UE canvas loads code from Code Sync. Uncommitted / unpushed model changes will not appear in:

```text
main--{repo}--{owner}.ue.da.live
```

---

## Part B — DA configuration (outside the repo)

This is what makes pages open in UE instead of only the document editor.

### B1. Open the config spreadsheet

Prefer **org** config (official docs):

```text
https://da.live/config#/{org}/
```

This project also worked with **site** config:

```text
https://da.live/config#/{org}/{site}/
```

Example that worked: site config UI titled **ac-b2b-poc config**, with sheets `data` / `library`, and a **Save** button.

### B2. Fill the `data` sheet

If the sheet is empty, create a header row first:

| Cell | Content |
|------|---------|
| A1 | `key` |
| B1 | `value` |
| A2 | `editor.path` |
| B2 | (full value below — one cell, no quotes) |

**Value format:**

```text
/{org}/{site}=https://experience.adobe.com/#/@{dxHandle}/aem/editor/canvas/{branch}--{repo}--{owner}.ue.da.live
```

**Exact value used for this project:**

```text
/krishnacv23/ac-b2b-poc=https://experience.adobe.com/#/@echidnaptrsd/aem/editor/canvas/main--ac-b2b-poc--krishnacv23.ue.da.live
```

| Token | This project | Your next project |
|-------|--------------|-------------------|
| `{org}` | `krishnacv23` | DA org name |
| `{site}` | `ac-b2b-poc` | DA site name |
| `{dxHandle}` | `echidnaptrsd` | From Experience Cloud URL (no `@` in table — keep `@` in the URL) |
| `{branch}` | `main` | Usually `main` for production preview |
| `{repo}` | `ac-b2b-poc` | GitHub repository name |
| `{owner}` | `krishnacv23` | GitHub owner / org |

Click **Save**.

### B3. Behavior after save

- Paths under `/krishnacv23/ac-b2b-poc` open in UE by default, **or**
- Document view shows **Open in UE**

---

## Part C — Verify end-to-end

1. Open DA site: `https://da.live/#/{org}/{site}`
2. Open or create a page
3. Confirm it loads in Universal Editor (Experience Cloud shell + live canvas)
4. Select a **section** → click **+** → confirm your blocks appear (including custom ones registered in the section filter)
5. Add a block, edit a field, save, and confirm the document updates in DA

### Feature-branch testing

Point the canvas host at a branch:

```text
https://experience.adobe.com/#/@{dxHandle}/aem/editor/canvas/{branch}--{repo}--{owner}.ue.da.live
```

Update `editor.path` temporarily, or open that canvas URL directly while browsing content.

---

## Checklist for a new project

Copy this list and fill in names:

```text
[ ] DX handle: @____________
[ ] UE canvas opens for: main--{repo}--{owner}.ue.da.live
[ ] DA org / site: /____________/____________
[ ] Repo has component-definition.json, component-models.json, component-filters.json
[ ] Repo has scripts/ue.js + loads it when hostname contains ue.da.live
[ ] Custom blocks have blocks/{name}/_{name}.json
[ ] New blocks listed in models/_section.json section filter
[ ] Ran npm run build:json and pushed to GitHub
[ ] editor.path set in DA config (org or site data sheet) and Saved
[ ] Opened a DA page → UE canvas works → blocks appear in +
```

**Template `editor.path` value:**

```text
/{org}/{site}=https://experience.adobe.com/#/@{dxHandle}/aem/editor/canvas/main--{repo}--{owner}.ue.da.live
```

---

## What we changed specifically in ac-b2b-poc

| Change | Why |
|--------|-----|
| Added `commerce-custom-product-list` to `models/_section.json` filters | Block model existed but was missing from UE “+” menu |
| Ran `npm run build:json` | Regenerated root `component-*.json` |
| Documented UE in `README.md` | Short in-repo pointer |
| Set DA site `data` sheet `editor.path` | Routes DA site into UE for `@echidnaptrsd` |

Already present from the commerce boilerplate (no new work needed):

- `scripts/ue.js`, `scripts/ue-utils.js`
- `IS_UE` detection and conditional load in `scripts/scripts.js`
- Existing block `_*.json` models and `build:json` pipeline

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Canvas URL access denied | UE / Sites not entitled | Adobe Admin Console / account team |
| DA page never opens UE | Missing or wrong `editor.path` | Check org/site `data` sheet; Save; path must start with `/{org}/{site}` |
| UE opens but blocks missing / “(no definition)” | Missing `component-*.json` or not pushed | Run `build:json`, push `main` |
| Custom block missing from + | Not in section filter | Add id to `models/_section.json`, rebuild JSON |
| Editing works in DA doc but canvas is broken | `ue.js` not loading | Confirm hostname is `*.ue.da.live` and `IS_UE` path runs |
| Changes not visible in UE | Wrong branch in canvas URL | Align `editor.path` branch with the branch you pushed |

---

## Out of scope (different product path)

This guide is **not** for:

- **AEM Sites as Cloud Service + Universal Editor (XWalk)** — AEM is the content source; see [UE tutorial on aem.live](https://www.aem.live/developer/ue-tutorial)
- Mixing AEM and DA as content sources in one EDS site (unsupported; use separate sites)

---

## Reference map (this project)

| Item | Value |
|------|--------|
| DX handle | `@echidnaptrsd` |
| DA site | `https://da.live/#/krishnacv23/ac-b2b-poc` |
| DA config (site) | `https://da.live/config#/krishnacv23/ac-b2b-poc` (or org: `...#/krishnacv23/`) |
| UE canvas | `https://experience.adobe.com/#/@echidnaptrsd/aem/editor/canvas/main--ac-b2b-poc--krishnacv23.ue.da.live/` |
| GitHub | `https://github.com/krishnacv23/ac-b2b-poc` |
