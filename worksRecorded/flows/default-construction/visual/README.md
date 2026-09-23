# Limeni Visual

Limeni-only default-construction diary tab. The backend checks active user membership, project ownership, organization ID and flow on every upload, read and analysis request.

## Workflow

1. Choose a diary location and upload its base PDF through UploadThing.
2. Snapshot the non-archived diary records and their linked photos for that location. Other locations and unlinked gallery photos are not included.
3. Analyze six evidence images per request against the PDF. Save progress after every batch. Reopening the view allows an interrupted analysis to resume.
4. Display suggested regions as independent coloured layers. Selecting a region reveals its diary source, image and alignment explanation.
5. Use “Atjaunot no žurnāla” to create a new analysis snapshot using the saved PDF and current diary records. Previous drawings/results remain available.

## Storage and runtime

- Existing `Documents` records, type `limeni-visual-v1`. The PDF URL is in `url`; versioned state, evidence snapshots, output, attempts and token usage are in `description` as JSON.
- Updates use compare-and-swap on the previous description to avoid lost updates from concurrent requests.
- No database migration is required. Diary values and Forma 2 calculations are never modified.
- Authenticated retrieval: `/api/sites/{siteId}/visual/{drawingId}`; PDF retrieval adds `?pdf=1`.
- Existing OpenAI provider/model configuration is reused, with optional `LIMENI_VISUAL_MODEL` override. No new provider credentials are required.
- PDF limit: 16 MB and 10 pages. Location limit: 200 linked evidence images. Inputs exceeding limits are rejected, never silently truncated.
- One model request per batch, 150-second timeout, no automatic SDK retries. The API route allows 240 seconds. A stale processing lease can be retried after 210 seconds.
- The initiating browser drives subsequent batches; closing the tab stops future batches, while the in-flight batch can finish and persist.

## Accuracy boundaries

The feature is designed primarily for marked-up floor plans. It does not infer completed floor area from quantities, provide verified measurements or calculate completion percentages. Geometry must reference known evidence, a valid PDF page, two distinct alignment anchors, confidence >= 0.90 and a valid normalized simple polygon. Colour is derived from the diary work name, not model-selected image colour.

Confidence is a model estimate, not a guarantee. Overlays are clearly marked as suggestions requiring review. Unmatched, ambiguous and unrelated images are listed separately. If none can be located, the UI shows “Nevar atrast darbus”.

## Verification

Mocked tests cover organization/project scope, selected-location snapshots, concurrent writes, retry/resume, model-output validation, unsafe PDF URLs, PDF size/page limits, rendering, layer toggles and uploads. No real model or production database is called by these tests.

Before rollout, verify with a real Limeni base drawing and its marked-up diary images, including a rotated crop, a different floor and an unrelated building. Review every proposed region against the source; this quality calibration is not replaced by the unit tests.
