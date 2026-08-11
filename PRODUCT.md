# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is owners and project managers at Latvian construction companies. They need reliable visibility into what happened on site without forcing site managers and workers to adopt another complicated reporting tool.

Site managers and workers are the primary data contributors: they report completed work, hours, materials, notes, and photos from the job site through familiar WhatsApp interactions.

## Product Purpose

WorksRecorded turns everyday field updates into structured project records. It exists to reduce late administrative work, preserve evidence from the job site, improve cost and progress visibility, and make required construction reporting easier.

For the marketing landing page, success means a qualified construction owner or project manager understands the mechanism and books a demo.

## Positioning

WorksRecorded uses WhatsApp voice messages, text, and photos as the low-friction input layer, then applies AI to organize those updates into a structured construction diary, project records, reports, and data that can be used with Latvia's BIS workflow.

## Operating Context

- Teams report from active construction sites where speed, gloves, noise, and limited desk time make conventional forms impractical.
- Office-side users review project progress, labor, costs, photos, and daily records in the WorksRecorded web dashboard.
- WhatsApp is the familiar field channel; WorksRecorded is the structured system of record and analysis layer.
- BIS documentation and avoiding duplicate data entry are important parts of the Latvian construction workflow.

## Capabilities and Constraints

- Capture voice messages, text, photos, work quantities, labor hours, and site context through WhatsApp.
- Structure incoming information by project, day, work, people, location, and supporting photos.
- Present daily construction records, galleries, labor/cost summaries, progress, and exports in a desktop dashboard.
- Support BIS-related construction diary workflows and data transfer.
- The landing experience is localized and must continue to support the project's existing locales.
- `Landing_V3` is an additive experiment. Existing `/Landing`, `/Landing_v2`, and their behavior must remain unchanged.
- The primary marketing action for V3 is `Rezervēt demo`; it must use the existing Calendly destination unless the product owner changes it.

## Brand Commitments

- Preserve the WorksRecorded name, wordmark treatment, and recognizable green, white, and dark-neutral identity.
- Keep WhatsApp central to the explanation, using the approved green WhatsApp mark and real WhatsApp product imagery already supplied.
- Use the real WorksRecorded interface and layout language when demonstrating the desktop product.
- The voice should be direct, practical, credible, and useful to construction decision-makers; avoid inflated software hype.

## Evidence on Hand

- Real WhatsApp phone artwork: `worksRecorded/public/frontend/pages/Home/HeroWhatsAppPhoneSource.png`.
- Real WorksRecorded dashboard artwork: `worksRecorded/public/frontend/pages/Home/HeroLaptopDashboardDiagram.png` and other screenshots under `worksRecorded/public/frontend/pages/Home/`.
- Real product demonstration videos are already embedded by locale in the current landing implementation.
- Existing customer/case-study assets include Deprom, LEC, and ZTC logos and published case-study routes under `worksRecorded/app/[locale]/Landing/CaseStudies/`.
- Existing Latvian product copy and capability descriptions are available in `worksRecorded/messages/lv.json`.
- A `4.8 / 5` rating appears in current marketing copy, but no substantiating source was found in the repository. Do not use it as verified proof in new work unless the product owner supplies the source.
- Do not invent testimonials, customer counts, quantified outcomes, prices, certifications, or benchmarks.

## Product Principles

1. Meet the field team in WhatsApp instead of adding another reporting burden.
2. Turn informal updates into structured, auditable project knowledge.
3. Make the field-to-office transformation visible and easy to understand.
4. Earn trust with real product evidence and construction-specific detail.
5. Reduce duplicate work across site reporting, management review, and BIS documentation.
