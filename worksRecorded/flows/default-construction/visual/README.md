# Limeni Visual

Limeni-only default-construction diary tab. The backend checks active user membership, project ownership, organization ID and flow on every upload, read and analysis request.

## Workflow

1. Choose a diary location and upload its base PDF through UploadThing.
2. Snapshot the non-archived diary records and their linked photos for that location. Other locations and unlinked gallery photos are not included.
3. Analyze six evidence images per request against the PDF. Save progress after every batch. Reopening the view allows an interrupted analysis to resume.
4. Display suggested regions as independent coloured layers. Selecting a region reveals its diary source, image and alignment explanation.
5. Each normalized location has one active drawing. Uploading a replacement requires confirmation. “Atjaunot no žurnāla” also requires confirmation and creates a new snapshot using the saved PDF and current diary records. Prior versions (including manual edits) are archived, not shown as additional drawings. Concurrent uploads are serialized with a transaction-scoped advisory lock; replacement must reference the current drawing.
6. “Sākt analīzi no jauna” resets the selected drawing’s overlays and reruns all its saved evidence using the current model. It retains the PDF, evidence snapshot and attempt history. Confirmation is required.
7. “Dzēst rasējumu” permanently removes the selected Visual document and its analysis after confirmation. Older duplicates for that location are archived so they cannot reappear. Diary records, source photos and other locations remain unchanged. The uploaded PDF file is retained because other snapshots may share it. Delete/restart reject an active analysis lease and use compare-and-swap protection.
8. Select a zone, then “Pielāgot zonu” to drag corners, add corners at edge midpoints, or remove a focused corner with Delete. Arrow keys also move corners (Shift uses a larger step). Changes stay local until “Saglabāt zonu”; “Atcelt” restores saved geometry. Saved edits retain source linkage and record editor/time. Invalid, self-crossing or stale edits are rejected. Restarting analysis replaces manual edits after confirmation.
9. Hovering or focusing a zone shows its work, diary date, description and quantity. Layer toggles and chronological “Zonu avoti” (oldest first, undated last) appear in a collapsible right sidebar. The map-style viewport has floating zoom/fit controls, drag-to-pan, and 100–500% wheel zoom anchored at the cursor. The fitted 100% view is the minimum zoom for both wheel and button controls. A single GPU transform moves the PDF and zones together with a 180 ms eased animation; reduced-motion preferences disable animation. Wheel magnitude is normalized for trackpads and mouse wheels. Resizing the viewport preserves the viewed center. All navigation is client-side with no PDF refetch or AI call. Polygon fill opacity is 50%, or 70% for the selected zone.

## Storage and runtime

- Analysis shows a spinner, completed/total/remaining image counts and a real batch progress bar. Counts advance only when a batch returns; upload and preparation have separate loading states. Interrupted analysis retains its remaining count.
- The date slider below the PDF shows cumulative zones through each calendar day, inclusive, using source diary dates in `Europe/Riga`. Slider changes and layer filters run entirely in the browser without AI calls or PDF reloads. Undated zones have an explicit opt-in when dated zones exist; if all dates are missing, all zones remain visible without inventing a date.

- Existing `Documents` records, type `limeni-visual-v1`. The PDF URL is in `url`; versioned state, evidence snapshots, output, attempts and token usage are in `description` as JSON.
- Updates use compare-and-swap on the previous description to avoid lost updates from concurrent requests.
- Archived versions use document type `limeni-visual-v1-archived`. Existing legacy duplicates are collapsed to the newest in the index without read-time database writes; replacing/deleting that location archives the older versions.
- No database migration is required. Diary values and Forma 2 calculations are never modified.
- Authenticated retrieval: `/api/sites/{siteId}/visual/{drawingId}`; PDF retrieval adds `?pdf=1`.
- Uses `gpt-6-astra` with `medium` reasoning, with optional `LIMENI_VISUAL_MODEL` override. Existing OpenAI credentials are reused; other AI flows are unchanged.
- PDF limit: 16 MB and 10 pages. Location limit: 200 linked evidence images. Inputs exceeding limits are rejected, never silently truncated.
- One model request per batch, 150-second timeout, no automatic SDK retries. The API route allows 240 seconds. A stale processing lease can be retried after 210 seconds.
- The initiating browser drives subsequent batches; closing the tab stops future batches, while the in-flight batch can finish and persist.

## Accuracy boundaries

The source sketch identifies the intended work area; the target structural PDF supplies its clean geometry. The prompt asks for straightened, plan-aligned boundaries rather than pixel-perfect ink tracing: wobbly room outlines become clean room polygons, and corridor strokes become corridor-shaped zones. It preserves partial-room coverage, openings, exclusions, visible crop limits and genuine angled/curved structural geometry.

The feature is designed primarily for marked-up floor plans. Once the drawing is aligned, the model makes a best-effort approximation from stripes, hatching, overlapping strokes, open outlines and cropped annotations, using walls and room geometry to interpret edges. Ambiguous attribution is resolved using diary context and explained in the result. It does not infer completed floor area from quantities, provide verified measurements or calculate completion percentages. Geometry must reference known evidence, a valid PDF page, two distinct alignment anchors and a valid normalized simple polygon. There is no numeric confidence cutoff. Colour is derived from the diary work name, not model-selected image colour.

Confidence is a model estimate, not a guarantee. All overlays are explicitly labelled approximate and require review. Unrelated drawings, unalignable plans, unmarked delivery photos and explicitly planned-only work still remain unlocated. Rough or ambiguous annotation boundaries alone must not cause rejection. If none can be located, the UI shows “Nevar atrast darbus”. Existing results are unchanged until the user selects “Sākt analīzi no jauna”.

## Verification

`node scripts/preview-limeni-visual.mjs` serves the actual Visual components at `http://127.0.0.1:4318` using synthetic diary records and a generated PDF. Server actions and upload hooks are replaced in-memory; the preview never connects to the production database or AI. This supports browser checks for zoom, panning, editing and responsive layout without authentication or production writes.

Mocked tests cover organization/project scope, selected-location snapshots, concurrent writes, retry/resume, model-output validation, unsafe PDF URLs, PDF size/page limits, rendering, layer toggles and uploads. No real model or production database is called by these tests.

Before rollout, verify with a real Limeni base drawing and its marked-up diary images, including a rotated crop, a different floor and an unrelated building. Review every proposed region against the source; this quality calibration is not replaced by the unit tests.
