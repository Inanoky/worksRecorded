# Construction planner

Available in the default-construction site diary through **Plāns** and **Rādīt plānu**. Other flow modules and the SB STOMME All projects inline fields are unchanged.

Plans are separate `ConstructionPlan` records, never synthetic actual diary records. New work/location/unit choices are appended to the site's existing configuration in the same transaction as a plan save. Existing rates and Forma 2 metadata are preserved.

Weeks run Monday–Sunday. Date locking and actual-record calendar dates use `Europe/Riga`. Today and earlier dates cannot be created, changed, moved, or deleted through the planner. Both the original date and replacement date must be future dates when editing. Version checks prevent overwriting another user's edits.

Comparison joins by day + normalized work + location + unit. NFKC normalization matches m²/m2; different units are never converted or added together. Repeated actual records are summed. Missing numeric quantities remain unknown rather than being treated as zero. The existing factual quantity profile is respected when enabled. Actual work is green above plan, red below plan, and neutral when equal, including future dates with recorded actual work. Future plans without actual work remain neutral. Unplanned actual work remains neutral.

**Rādīt plānu** expands the existing daily cards, never a separate comparison table. The global checkbox controls all cards; each card can override it independently. Switching the global checkbox resets local overrides. Planned work and quantity appear immediately before actual work and quantity. Existing actual rows, selection, actions, sources, photos and costs remain intact. Mobile records show paired plan/actual details. The weekly dialog remains for editing plans.

Plan comparisons preload in the background for default-construction diaries and remain in client state when hidden. Global and per-day show/hide toggles never trigger requests. Data refreshes when diary rows change or a plan is saved/deleted; existing cached comparisons remain visible during background refresh. Site IDs guard cached data against cross-site reuse. Comparison totals load all non-archived actuals for planned days, independently of pagination and keyword filters. Repeated actual rows share a daily status; the planned quantity appears once per bucket on each visible page, with the total actual amount shown underneath. Unmatched plans are inserted into the corresponding daily card. Plan-only dates are added on the first diary page with the global toggle enabled; date/work/location/text filters apply. No synthetic actual records are created. Turning the toggle off restores the original columns and legacy quantity-profile presentation.

Default-construction daily cards use normal page scrolling rather than a fixed-height nested scroll area. Expanded tables use proportional columns and wrapping text without a horizontal scrollbar. Below the extra-large breakpoint, expanded records use the stacked mobile layout. ZTC scrolling and tables are unchanged.

## Activation

The migration `20260916120000_add_construction_planner` adds one table with a site foreign key, a unique daily matching key, quantity checks, RLS, and no anonymous/authenticated direct-table grants. No existing diary rows or columns are altered.

This migration was applied with production approval on 2026-09-16. Deploy the UI with a regenerated Prisma client. The daily-card and instant-toggle changes need no additional migration.

## Verification

`npx jest --runInBand flows/default-construction/planner server/actions/construction-planner.test.ts`

Server tests mock the database; browser checks use mock data. No production plan writes are part of these tests.
