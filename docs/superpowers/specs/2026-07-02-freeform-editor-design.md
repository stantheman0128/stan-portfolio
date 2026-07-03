# Freeform on-page editor ("edit.html") — design

Owner decision (2026-07-02): pure freeform DOM editing (option B), explicitly chosen over
data-bound in-place editing (A) after trade-offs were presented. Accepted costs, reframed
as product rules:

1. A theme is a STARTING TEMPLATE. Once you edit, the page is yours; switching template
   restarts from scratch (confirm dialog required).
2. The artifact is a full static HTML page. Autosaved to localStorage; Export downloads a
   self-contained `stan-site.html`. Publishing later = shipping that HTML as the site.

## What it is
- `edit.html` + `src/studio/freeform.js`. No side panel — the rendered site IS the editor.
- Boot: restore localStorage draft if present; else fetch `data/content.json`, render the
  chosen theme via shared `renderSite()` (DOMParser + documentElement swap, same as site.js).
- Editing: `body.contentEditable` — click any text and type. Hover ANY element → light
  overlay outline + controls: ✕ delete, ⧉ duplicate (duplicate-an-item-card is how you add
  a new project). Double-click an image → file picker → embeds as data URL (survives save).
- Toolbar (LIGHT chrome, per owner's complaint about the dark Studio): template picker
  (confirm = restart), structural Undo (for deletes/duplicates; text undo stays native),
  Edit/Preview toggle, save-state indicator, Export HTML, Reset. Toolbar is
  `contenteditable=false`, marked `data-ff-chrome`, stripped from all saved/exported output.
- Autosave: debounced MutationObserver → serialized document (chrome stripped) to
  localStorage `freeform-draft-v1`. Ctrl+S forces a save.

## Non-goals (YAGNI)
- No mapping back to content.json (that's the Studio's job; both tools coexist).
- No drag-reorder, no rich-text toolbar (bold/italic via native shortcuts), no multi-page.

## Verification
Playwright/headless: text edit → reload → persists; delete + duplicate persist; exported
HTML contains no editor chrome; light-toolbar screenshot; no horizontal overflow.
