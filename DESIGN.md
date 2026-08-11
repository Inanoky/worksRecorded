---
name: "WorksRecorded Landing V3"
description: "Field updates become management evidence through a precise construction-review interface."
colors:
  ink: "#0b1324"
  forest: "#06492f"
  forest-deep: "#033b27"
  whatsapp-green: "#2fc26b"
  route-green: "#08783f"
  mineral: "#f4f8f4"
  white: "#ffffff"
  body-green: "#263b31"
  muted-green: "#56675e"
  technical-line: "#bed4c6"
  pale-divider: "#dbe7df"
  device-black: "#060b13"
typography:
  display:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(3rem, 5.35vw, 5.65rem)"
    fontWeight: 720
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(2.7rem, 4.4vw, 4.8rem)"
    fontWeight: 720
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(1.08rem, 1.55vw, 1.35rem)"
    fontWeight: 620
    lineHeight: 1.55
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 400
    lineHeight: 1.75
  action:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 720
    lineHeight: 1
  technical-label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
    lineHeight: 1
rounded:
  square: "0"
  subtle: "4px"
  control: "7px"
  surface: "10px"
  screen: "12px 12px 4px 4px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  control-padding: "0 22px"
  section-inline: "clamp(28px, 4vw, 64px)"
  section-block: "clamp(92px, 10vw, 150px)"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-padding}"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.forest-deep}"
    textColor: "{colors.white}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-padding}"
    height: "48px"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.74)"
    textColor: "{colors.forest}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-padding}"
    height: "48px"
  technical-index:
    backgroundColor: "transparent"
    textColor: "{colors.route-green}"
    typography: "{typography.technical-label}"
    rounded: "{rounded.circle}"
    size: "26px"
---

# Design System: WorksRecorded Landing V3

## Overview

**Creative North Star: "The Field Evidence Chain"**

The system makes the transformation from an informal field update to management evidence visible rather than merely claiming it. White and mineral-green drawing fields, forest construction lines, charcoal grotesk type, and real black devices create the feeling of a live construction review: practical, measured, and credible.

Composition behaves like an annotated working sheet. A narrow claim rail sits beside oversized product evidence; leaders, endpoints, numbered steps, and ruled panels expose the path from WhatsApp input to structured record to cost control. It deliberately refuses the centered, floating-card SaaS hero and keeps the primary action beside the offer it resolves.

**Key Characteristics:**

- Dashboard-led rather than slogan-led
- Matte drawing fields with precise forest linework
- Real product imagery held in convincing black hardware
- Compact grotesk hierarchy with condensed technical notation
- One visible chain from field input to management decision

## Colors

The palette is a quiet construction document built from forest greens, mineral paper, charcoal ink, and a narrowly controlled WhatsApp signal.

### Primary

- **Review Forest:** The main brand field and primary-action color; it anchors buttons, key lines, and structured emphasis without turning the page into a green wash.
- **Deep Forest:** The sectional anchor for principles and closing actions, and the stronger hover state for Review Forest.
- **Route Green:** The active technical color for leader lines, endpoints, indexes, linked outcomes, wordmark emphasis, and focus-visible rings.

### Secondary

- **WhatsApp Signal:** The brighter approved channel green, reserved for WhatsApp identity, positive marks, focus-visible rings, and small high-information accents.

### Neutral

- **Charcoal Ink:** The default headline and wordmark color; nearly black with enough blue-green character to sit beside the forest palette.
- **Mineral Drawing Field:** The pale working surface behind grids, measurements, and evidence-led sections.
- **Clean White:** The uncoated page field, reversed copy, and high-contrast closing action.
- **Body Green:** The high-readability lead-copy neutral.
- **Muted Green:** The lower-emphasis body-copy neutral.
- **Technical Line:** The soft measuring-line color for rules and construction structure.
- **Pale Divider:** The quieter separator for client proof and editorial partitions.
- **Device Black:** The physical frame color used to make real product screens feel materially grounded.

### Named Rules

**The Controlled Green Rule.** Deep forest carries hierarchy; bright WhatsApp green is a signal for channel identity, positive marks, focus, and state, never a broad decorative field.

**The Evidence Contrast Rule.** Product screenshots belong inside true black hardware against white or mineral fields so evidence reads before ornament.

## Typography

**Display Font:** Archivo (with sans-serif fallback)  
**Body Font:** Archivo (with sans-serif fallback)  
**Label Font:** Barlow Condensed (with sans-serif fallback)

**Character:** Archivo is a compact, practical grotesk that can hold construction authority without corporate stiffness. Barlow Condensed introduces a drawing-notation voice only where sequence, measurement, and small technical labels need denser rhythm.

### Hierarchy

- **Display** (720, fluid hero scale, 0.98 line-height): Large offers and closing statements; tightly tracked and balanced across a narrow copy rail.
- **Headline** (720, fluid section scale, 0.98 line-height): Section-level decisions and proof claims, using the same compact silhouette at a lower scale.
- **Lead** (620, fluid reading scale, 1.55 line-height): The decisive explanation immediately following a heading, constrained to about 64 characters per line.
- **Body** (400, compact body scale, 1.75 line-height): Supporting detail and evidence context, constrained to about 68 characters per line.
- **Action** (720, compact control scale): Primary, secondary, and closing actions; confident sentence-case labels with no artificial letter spacing.
- **Technical Label** (700, condensed small scale): Circular indexes, fact labels, and two-digit sequence notation; isolated from long-form reading.

### Named Rules

**The Compression Rule.** Use tight tracking and heavy Archivo for decisive claims; use Barlow Condensed only for compact technical notation, never for paragraphs or the main offer.

## Layout

The wide-screen system uses a maximum working width of 1460px with an asymmetric 36/64 grid: the copy rail is intentionally narrow and the product-evidence field is oversized. Section gaps expand fluidly from 42px to 84px, while the header uses a separate 1536px maximum and a 72px sticky height. Major evidence sections carry generous fluid vertical space and a measured horizontal inset; the density belongs inside annotated product compositions, not inside the prose rail.

Mineral sections use a 72px square line grid and an 18px measuring rail with 64px ticks. Evidence frames can extend beyond the nominal content column so dashboards feel operational rather than like card thumbnails. Ruled client and principle regions use split panels and repeated cells instead of floating cards.

At 1120px, navigation yields before the evidence composition does. At 820px, the two-column grid becomes one column, measuring rails and SVG leaders disappear, and actions adapt to the available width. At 560px, annotation flows stack into a single ordered sequence, device evidence is deliberately cropped larger, and closing/footer actions become vertical.

**The Evidence Beside Claim Rule.** On wide screens, keep a narrow claim rail beside oversized product evidence; do not center the offer above a generic card cluster.

**The Responsive Reduction Rule.** Preserve the story order on small screens, but remove leader-line decoration before shrinking text or product evidence into illegibility.

## Elevation & Depth

The system is flat by default. White, mineral, and forest fields are separated through tone and one-pixel rules; shadows belong to physical devices, the play control, and high-priority actions. Laptop and phone drop shadows are deeper than control shadows because they establish material objects, while editorial cells and annotation rows remain matte.

### Shadow Vocabulary

- **Action Rest** (`0 10px 24px rgb(3 59 39 / 16%)`): Quiet lift beneath the forest primary action.
- **Action Hover** (`0 14px 28px rgb(3 59 39 / 22%)`): Slightly stronger lift paired with a two-pixel upward movement.
- **Laptop Body** (`drop-shadow(0 30px 30px rgb(11 19 36 / 18%))`): Broad physical separation for the desktop device.
- **Phone Body** (`drop-shadow(0 26px 22px rgb(11 19 36 / 25%))`): Tighter, darker separation for the overlapping phone.
- **Video Stage** (`0 28px 40px rgb(11 19 36 / 18%)`): Structural depth for the black demonstration frame.

### Named Rules

**The Physical Objects Only Rule.** Keep content surfaces matte; reserve meaningful elevation for devices, playback, and actions that must feel operable.

## Shapes

The form language is technical and mostly square. Ruled sections, grids, annotation baselines, and proof cells use straight one-pixel geometry. Buttons use only a subtle 7px softening; video surfaces use 10px, while laptop screens use a 12px top corner that tightens to 4px at the hinge. Circular shapes are functional endpoints, indexes, and the play control—not decorative bubbles. The phone keeps its real hardware silhouette rather than being forced into the page radius system.

**The Square Working Surface Rule.** Use straight edges for information architecture and modest radius only where an element must feel graspable, physical, or interactive.

## Components

### Buttons

Buttons are compact technical controls with enough weight to remain visible beside oversized product evidence.

- **Shape:** Subtly softened control corners with a fixed 48px height and 22px horizontal inset.
- **Primary:** Review Forest field with Clean White copy, a matching one-pixel border, and restrained action lift.
- **Hover / Focus:** Moves upward by 2px over 160ms with the expressive standard easing; darkens to Deep Forest and receives a 2px WhatsApp Signal focus outline offset by 4px.
- **Secondary:** Translucent white field, soft green border, and Review Forest copy; it shares primary dimensions and movement.
- **Closing:** The main action reverses to white on Deep Forest, while the alternative remains transparent with a low-opacity white rule.

### Navigation

Navigation is quiet enough to leave the product proof dominant. Desktop links use compact semibold Archivo in a muted neutral; hover draws a one-pixel Review Forest underline from left to right over 180ms. The header is sticky, translucent white, and lightly blurred with a single pale lower rule. Desktop navigation disappears at 1120px while language, sign-in, and the demo action remain.

### Technical Annotations

Annotation steps are the system's signature explanatory component. A one-pixel forest or muted-green baseline feeds a 26px circular condensed index, followed by a compact title and clamped supporting line. On wide screens, SVG leaders terminate in small outlined circles at real regions of the product screen; on small screens, the ordered annotation rows remain while the leaders disappear.

### Product Devices

Real screenshots sit inside purpose-built black laptop and phone frames. Laptop screens use a 3:2 or 16:10 crop with a thick responsive bezel and a dark hardware base; phones overlap the laptop to preserve the visible field-to-office relationship. Device size and crop may exceed the layout column, but the relevant screen content must remain legible.

### Client Proof Strip

Customer proof is a ruled, full-width strip rather than a collection of badges. The copy cell occupies roughly one third, three equal logo cells fill the remainder, and one-pixel pale dividers carry the structure. Logos rest in grayscale at reduced opacity and reveal their native color on hover.

### Principle Cells

Principles sit on a Deep Forest field in a two-column ruled matrix. Each cell has a two-digit Barlow Condensed index, a WhatsApp Signal check mark, and calm near-white body copy. At narrow widths the matrix becomes one column without introducing cards or shadows.

### Video Stage

The demo is framed as black product evidence with a restrained green overlay. A 70px circular play control supplies the only large circular gesture; on hover it scales gently and shifts to Route Green. Playback replaces the poster in place so the page geometry does not jump.

## Do's and Don'ts

### Do:

- **Do** show the causal sequence from WhatsApp input through structured record to management outcome in one legible chain.
- **Do** use real WorksRecorded screens inside materially convincing black device frames.
- **Do** keep primary actions beside the claim or offer they resolve.
- **Do** use one-pixel forest rules, numbered endpoints, and restrained measurement details to explain product relationships.
- **Do** reduce animation and remove nonessential leader graphics when motion preferences or viewport size require it.

### Don't:

- **Don't** replace the asymmetric dashboard-led hero with centered copy and floating generic SaaS cards.
- **Don't** use WhatsApp Signal as a broad background or decorative gradient; its rarity identifies channel input, positive state, and keyboard focus.
- **Don't** add shadows to ordinary content cells, client proof, or annotation rows.
- **Don't** round every container; square ruled fields are the default information architecture.
- **Don't** substitute invented metrics, illustrations, or abstract UI for real product evidence.
