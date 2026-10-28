# Limeni spending analytics

Open a Limeni project and choose **Izmaksu dinamika** (`/dashboard/sites/[siteId]/spending`). The page checks project and organization access before rendering.

The page uses the authorized `LimeniProjectData` cache: the saved Forma 2 contract and allocations, journal costs, invoice costs, and drawing measurements. `DefaultConstructionSpending` subscribes to that cache, so background project updates refresh the analytics without extra chart requests. If access is denied or data is unavailable, the page shows an error/loading state; it never substitutes generated figures. Cached data is explicitly identified when a background refresh fails. Private project snapshots are not committed.

Charts, filters, work grouping, measured m², percentages and forecasts calculate in the client. Positive differences from the contract value are green. Work progress caps each contract position at its planned quantity while keeping excess measured quantities visible. Finish forecasts use the last 28 calendar days of measured progress; no recent progress means no finish estimate.

The cost forecast applies the observed contract-cost-to-earned-value ratio to remaining contract value. Already recorded additional costs are included once. It is a scenario rather than a project budget or profit calculation. Purchased stock, missing costs and future extras can change the result.

The full-range date filters automatically extend when new dated sources arrive; manually selected ranges stay fixed. Saved allocations are used exactly as stored, with no proposed reassignment overlay. Unassigned invoice costs are included in financial totals and shown as unassigned sources. Original journal messages and invoice links remain available in the source table. Only measured drawing quantities count toward completion.

`spending-demo.ts` remains a development/test fixture. The deployed spending route does not import it.
