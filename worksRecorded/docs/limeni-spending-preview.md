# Limeni spending analytics

Open a Limeni project and choose **Izmaksu dinamika** (`/dashboard/sites/[siteId]/spending`). The page checks project and organization access before rendering.

The deployed page uses deterministic demonstration data from `spending-demo.ts`. It is labelled as demonstration data and does not query, change or publish real journal records, invoices, contacts or material allocations. The local review snapshot is not included in the repository.

Charts, filters, work grouping, measured m², percentages and forecasts calculate in the client. Positive differences from the contract value are green. Work progress caps each contract position at its planned quantity while keeping excess measured quantities visible. Finish forecasts use the last 28 calendar days of measured progress; no recent progress means no finish estimate.

The cost forecast applies the observed contract-cost-to-earned-value ratio to remaining contract value. Already recorded additional costs are included once. It is a scenario rather than a project budget or profit calculation. Purchased stock, missing costs and future extras can change the result.

To connect live data later, replace the demonstration wrapper with the authorized project cache snapshot and its configured work groups. The chart components accept Forma 2 client snapshots and do not need server calls for interactions.
