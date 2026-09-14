# PRAVAH — Design & UX Specification

**Predictive Resilient Accessibility & Logistics Intelligence Network**
AI-powered Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region
Prepared for: Ministry of Development of North Eastern Region (MDoNER) — SIH 2026, PS 26002

---

## 1. Purpose of this document

This document defines how PRAVAH looks, navigates, and communicates — not what it computes. The engines (prediction, priority, routing, mission) are specified elsewhere; this file exists so that intelligence a machine produces actually reaches a district authority, a field officer standing on a washed-out road, or a state administrator, in a form each of them can act on in seconds.

A government logistics platform fails in the field, not in the lab. The two operators who matter most — a district officer approving a mission at 6 AM, and a field worker reporting a blocked bridge with two bars of signal — are the design's primary constraints. Everything below is written to serve them first.

---

## 2. Design philosophy

**Clarity before polish.** This is a decision-support tool for emergency and essential-goods logistics. A confusing screen has a real-world cost: a delayed delivery, a missed evacuation window. Nothing in the interface should require the user to interpret, guess, or hunt.

**Built for the least favourable conditions, not the best.** Design for a cracked five-year-old Android phone, patchy 2G, bright outdoor sunlight, monsoon rain on the screen, and a user who may be operating one-handed while holding an umbrella or a torch. If it works there, it works everywhere.

**One truth, never hidden.** Section 19 of the architecture is explicit: PRAVAH must never hide data staleness. The interface follows the same rule — every screen that shows live or predicted data also shows *when* that data is from and how confident the system is in it.

**Accessible by default, not by request.** Because this is a Government of India platform, accessibility is a compliance requirement (GIGW 3.0 and WCAG 2.1 Level AA, mandatory for government websites and apps under DARPG's adopted guidelines) — but it is treated here as a baseline for everyone, not a separate mode for some users. High contrast, large touch targets, and plain language help a tired night-shift officer exactly as much as they help a user with low vision.

**Recommend, never decide silently.** Per the human-in-the-loop principle (Section 32 of the architecture), PRAVAH's UI always shows a recommendation as a recommendation — with its reasoning attached — and always requires an explicit human approval before a mission executes. The interface must never make this boundary ambiguous.

**Progressive disclosure.** State administrators, district authorities, and field officers do not need the same depth of information at the same time. The web app moves from summary to detail (state → district → community → road/mission); the mobile app shows only what a specific mission needs, not the whole network.

---

## 3. Who this is designed for

| Role | Where they work | Primary device | What they need most from the UI |
|---|---|---|---|
| State administrator | Command centre | Large desktop / wall display | An honest, glanceable picture of the whole state — no drill-down needed to spot trouble |
| District authority | District office | Desktop / tablet | Their district only, with the ability to approve missions and see what's blocked |
| Logistics coordinator | District/state office | Desktop | Resource, vehicle, and route detail — the working screen for planning |
| Field officer | Roadside, remote villages | Low/mid-range Android phone, often offline | Their one assigned mission, a fast way to report a problem, and confidence that a report went through |
| Vehicle operator | En route | Phone (driver-mounted or passenger-held) | Turn-by-turn direction, current mission status, and a clear signal if the route changes |

No screen in this system should ever assume all five see the same thing. The interface adapts to the role, not the other way round.

---

## 4. Information architecture

### 4.1 Web application — Command and Intelligence layer

Follows the State → District → Community hierarchy defined in the architecture (Section 17), with drill-down into roads, bridges, resources, vehicles, and missions at any level.

```
Home (State view)
├── District view
│   ├── Community view
│   │   ├── Accessibility & priority detail
│   │   ├── Supply status
│   │   └── Recommended action
│   ├── Roads & bridges (map layer)
│   ├── Active missions
│   └── Field reports (review queue)
├── Alerts (P0–P3, all levels)
├── Resources & vehicles
├── Missions (planning, approval, history)
└── Settings (language, role, theme, accessibility preferences)
```

Rule: nothing below the top level is more than **three taps or clicks from Home.** If a state administrator sees "38 at-risk communities," they must be able to reach the specific community, its reasoning, and its recommended action within three interactions.

### 4.2 Mobile application — Field execution layer

The mobile app is not a smaller web app. It is intentionally narrow: one officer, one assigned mission, one reporting path. Per Section 13, the field workflow is linear:

```
Login → Assigned mission → Mission package (map, cargo, contacts)
   → Report incident (voice / text / photo) → Local confirmation
   → Sync when possible → Delivery confirmation
```

There is no "browse the whole network" mode on mobile. A field officer is never shown state-wide data they cannot act on — this reduces cognitive load and keeps the app light enough to run on old hardware and thin data plans.

---

## 5. Visual design system

Every colour, spacing value, radius, and type weight below is a **design token** — defined once here, reused everywhere. A button, a card, or a status badge looks and behaves identically whether it appears on the state dashboard, a district drill-down, or the mobile app. If a new screen needs a visual pattern that doesn't exist yet, it's added to this system first and then reused — never designed one-off for a single screen. This is what keeps a platform used by five different roles across two apps feeling like one product rather than five.

### 5.1 Colour system

Colour in PRAVAH does two jobs, and the palette keeps them strictly separate: a small **brand/functional set** for navigation, actions and structure, and a **status set** reserved exclusively for network and alert conditions. Status colours are never used decoratively; brand colours never carry status meaning. This separation is what lets a district authority and a field officer read the same signal the same way on two completely different screens.

**Brand and functional palette**

| Token | Hex | Used for |
|---|---|---|
| Primary | `#1B4B73` | Primary buttons, links, active navigation, focus outlines |
| Primary (hover/pressed) | `#123A5A` | Hover and pressed states on primary actions |
| Primary tint | `#E7EEF4` | Selected rows, active nav background, subtle highlight |
| Page background | `#F7F8F9` | Default app background — off-white, not stark white, to reduce screen glare for outdoor field use |
| Surface | `#FFFFFF` | Cards, panels, modals |
| Border | `#D8DBDE` | Dividers, card outlines, table borders |
| Text primary | `#1A1D1F` | Body text, headings — near-black rather than pure black, softer for long dashboard sessions |
| Text secondary | `#5B6066` | Captions, timestamps, helper text |

Deep blue is deliberately chosen as the single brand colour: it reads as official and trustworthy without competing with any of the five status colours below (none of which is blue), so a "Primary" button never risks being misread as a status signal. It also stays clear of saffron/green/tricolour associations, keeping the interface neutral and functional rather than symbolic.

**Status palette** — each status has three forms: a light *tint* for backgrounds/badges, a *text/icon* shade for labels on that tint, and a *solid* shade for map markers and icons on plain white. Every text/tint pairing below is verified at **4.5:1 contrast or higher** (WCAG AA for text); every solid marker is verified at **3:1 or higher** (WCAG AA for graphical/non-text elements, the correct threshold for icons and map pins per WCAG 1.4.11).

| State | Tint (background) | Text/icon on tint | Solid marker on white | Verified contrast |
|---|---|---|---|---|
| Open / normal | `#E6F4EA` | `#1E7A34` | `#2E7D46` | 4.76:1 (text), 5.07:1 (marker) |
| Restricted | `#FFF3D6` | `#8A5B00` | `#B8860B` | 5.32:1 (text), 3.25:1 (marker) |
| High risk | `#FDEBDD` | `#A64D0B` | `#D2691E` | 4.91:1 (text), 3.63:1 (marker) |
| Blocked / critical | `#FBE7E7` | `#B42318` | `#D92D20` | 5.54:1 (text), 4.83:1 (marker) |
| Unknown / offline | `#EEEFF1` | `#5B6066` | `#8A8F94` | 5.51:1 (text), 3.0:1+ (marker) |

These pairs were checked with the standard WCAG relative-luminance formula; re-verify with a contrast checker (e.g. WebAIM) against the final rendered colours once implemented, since screen calibration and any further shade adjustment can shift the ratio slightly.

Two hard rules on top of the palette:
1. **Colour is never the only signal.** Every coloured status also carries a text label and, on maps, a distinct icon shape (circle/triangle/square/cross) — this covers colour-blind users and satisfies GIGW/WCAG's "don't rely on colour alone" requirement.
2. **The status palette is closed.** No sixth colour gets added for a new feature without also deciding what existing status it might be confused with. If a new concept doesn't map to open/restricted/high-risk/blocked/unknown, it uses a brand or neutral tone instead — never a new hue.

### 5.2 Typography

**Typeface: Noto Sans**, across all scripts the platform needs to render — Latin (English), Bengali script (Assamese), Devanagari (Hindi, Bodo), and others as NER language coverage expands. Noto Sans is chosen specifically because it is one typeface family with consistent weight and spacing across all of these scripts, so a bilingual screen (e.g. an alert shown in English and Assamese together) doesn't visually clash. A government platform switching fonts between languages reads as unfinished; one type family avoids that.

- Minimum body text size: **16px** on web, **16sp** on mobile — never smaller, including in tables and captions.
- Line length capped around 70–75 characters on wide screens so command-centre dashboards on large monitors stay readable, not stretched edge-to-edge.
- No text is ever rendered as an image. This is a hard accessibility requirement — image-only text cannot be resized, translated, or read by a screen reader.

**Weight scale — emphasis is created by weight, not by colour, size, or capitals**

| Weight | Use |
|---|---|
| 400 Regular | Body text, descriptions, table cell values, helper text |
| 500 Medium | Section headers, table column headers, navigation labels, secondary emphasis inside a sentence |
| 600 Semibold | Page/screen titles, key dashboard numbers (e.g. "38 at-risk communities"), button labels, alert titles |

When something needs to stand out, move up this scale rather than reaching for colour or a larger size — colour is reserved exclusively for status (Section 5.1), and inflating size for emphasis breaks the type scale's rhythm. **Never use ALL CAPS for emphasis.** Beyond reading as shouting, capitalisation as an emphasis device is a Latin-script convention that doesn't exist in Devanagari or Bengali script — it would silently break the moment a screen is viewed in Hindi or Assamese. Sentence case and weight are the only emphasis tools used anywhere in the interface.

### 5.3 Iconography

**Icon set: Tabler Icons** (outline style), used consistently across web and mobile.

Reasoning:
- **Open-source and MIT-licensed** — no vendor lock-in and no recurring licence cost, which matters for a platform built for a government ministry and intended to scale statewide and beyond.
- **Outline style, single consistent stroke weight** — outline icons read clearly at small sizes and stay legible in bright outdoor sunlight better than filled/solid icon sets, which can smear into a single dark blob on a low-brightness field phone screen.
- **Large, purpose-relevant coverage** — Tabler already has well-formed icons for everything this platform needs without custom drawing: roads, bridges, trucks, motorbikes, GPS pins, alert triangles, cloud/rain/flood, signal strength, and sync/offline states.
- **Actively maintained**, reducing the risk of depending on an abandoned library over a multi-year government deployment.

If a specific icon PRAVAH needs is missing from Tabler (e.g. a very specific regional transport type), **Material Symbols (outlined variant)** is the fallback — also free, extensively tested for accessibility, and stylistically close enough (single-weight outline) not to visually clash if mixed sparingly.

**Icon usage rules**

- Icons are simple and outline-style throughout; no mixed filled/outline icons on the same screen.
- Icons are always paired with a text label on first use. Icon-only controls are reserved for universally understood actions (back, close, search) — anything domain-specific (report incident, approve mission, sync) always carries a label, since an unlabeled icon is a guessing game for a first-time or infrequent user.
- Every status icon (blocked, restricted, high-risk, open, unknown/offline) has one fixed shape + colour combination used identically everywhere it appears. A blocked bridge looks the same icon, same colour, same shape on a district dashboard map, in an alert card, and on a field officer's mission map pin — no re-styling per screen.
- Icon size minimum: 20px on web, 24px on mobile (before the surrounding touch target padding described in Section 8).
- Decorative icons (those repeating an adjacent text label) are marked `aria-hidden` so screen readers don't announce redundant information; functional icon-only buttons always carry an `aria-label`.

### 5.4 Layout and spacing

- 8px base spacing unit across both web and mobile, so components line up predictably.
- Web: card/panel-based layout with a persistent left-hand navigation for State → District → Community, and a right-hand detail panel that never fully replaces the list (so users don't lose their place when drilling down).
- Mobile: single-column, thumb-reachable layout. Primary actions (report incident, confirm delivery) sit within the bottom third of the screen, reachable one-handed.

### 5.5 Shape — corner radius

Corners are softened just enough to feel approachable, never rounded into pills or bubbles — a government logistics tool should read as precise and dependable, not playful.

| Element | Radius |
|---|---|
| Inputs, chips, badges, small tags | 4px |
| Buttons | 6px |
| Cards, panels, modals | 8px |
| Toggle switches | Full pill — the one deliberate exception, since that shape is a universally understood control |

No element ever exceeds 8px unless it's a toggle switch or a genuinely circular element (an avatar, a single-icon status badge). A radius that grows with the size of its box reads as decorative rather than structural, and is avoided throughout — the same small radius scale is used whether the box is a chip or a full dashboard panel.

### 5.6 Interactive states — making "clickable" obvious

Nothing in PRAVAH should ever require a click just to find out whether something is clickable. Every interactive element carries five explicit states, defined once as design tokens and reused everywhere they appear:

| State | Treatment |
|---|---|
| Default | Primary buttons: filled `#1B4B73`, white text. Secondary buttons: `#1B4B73` outline (1.5px), transparent fill, `#1B4B73` text — so primary vs. secondary action is unambiguous at a glance on every screen. |
| Hover (web) | Primary darkens to `#123A5A`; secondary fills lightly with the primary tint; cursor becomes a pointer. |
| Pressed/active | Slightly darker still, with a 1px inward shift — a small tactile cue that a tap registered, which matters most on a touchscreen where there's no cursor to confirm hover. |
| Focus (keyboard) | A visible 2px outline in `#1B4B73`, offset 2px from the element — kept distinct from hover, since keyboard-only users never trigger a hover state. This satisfies GIGW/WCAG 2.4.7 and is never removed with `outline: none`. |
| Disabled | ~40% opacity and a not-allowed cursor — visibly distinct so an unavailable action is never mistaken for a broken one. |

Links inside body text are always underlined, never colour-only — the same "don't rely on colour alone" rule from Section 8, applied specifically to inline text links.

### 5.7 Motion — the interface should feel alive, not static

A screen that never moves reads as broken or frozen, which is the worst possible impression for a dashboard whose entire job is showing live conditions. PRAVAH uses small, purposeful motion to communicate that data is current and the system is working — never motion for decoration.

- **Live data feels live.** Timestamps tick upward in place ("Updated 8s ago…") instead of staying frozen until a manual refresh. When a new alert or mission update arrives, the relevant counter or card gives a single soft pulse — not a repeating animation — so the change catches the eye without needing to be hunted for.
- **Navigation feels like one connected space.** Drilling from State → District → Community uses a brief slide/fade transition (200–250ms), not a hard page reload, so the hierarchy feels continuous rather than a stack of separate pages.
- **Every tap gives immediate feedback.** Buttons, list rows, and cards respond the instant they're touched (the pressed state from 5.6) — a user should never wonder whether their tap registered.
- **Loading never looks like broken.** Screens use skeleton placeholders (soft grey shapes in the outline of the content that's coming) instead of a blank white screen or a bare spinner, so the app visibly looks like it's working — particularly important on the low-powered, poor-network devices this platform targets.
- **Motion is fast and gets out of the way.** 150–250ms for micro-interactions, never more than 400ms for any transition — lingering animation feels sluggish on older hardware.
- **Motion is always optional.** Every animation respects the device's reduced-motion setting (`prefers-reduced-motion`); a user with that setting enabled gets instant state changes with no animated transition. This is a hard accessibility requirement, not a nice-to-have.

### 5.8 Dark mode theme

Dark mode is included for a genuine operational reason, not as a cosmetic option: state and district command centres often run overnight during active disruptions, and a bright white dashboard in a dim night-shift room causes real eye strain over an 8+ hour watch. It also helps the field app on OLED phone screens, where a dark interface draws meaningfully less battery — worth having when a field officer's phone may not see a charger for a full day.

Dark mode is a second value for every token already defined in Section 5.1 and 5.2 — never a separately designed theme. The same brand hue, the same five status meanings, and the same weight/spacing/radius rules apply; only lightness shifts. A user can switch via a setting (light / dark / match system), and the two themes are never mixed on one screen.

**Base palette (dark)**

| Token | Hex | Used for |
|---|---|---|
| Page background | `#101214` | Default app background in dark mode — near-black, not pure black, to avoid the harsh edge pure black creates against surface panels |
| Surface | `#1B1F23` | Cards, panels, modals |
| Border | `#2E3338` | Dividers, card outlines, table borders |
| Text primary | `#F1F2F3` | Body text, headings |
| Text secondary | `#A9AFB5` | Captions, timestamps, helper text |
| Primary (links/text) | `#7FB3E0` | Links and any text-only use of the brand colour — lightened from the light-mode `#1B4B73` since a dark background needs a brighter foreground to hold contrast |
| Primary button fill | `#2E6B9E` | Filled primary buttons (white text on top) |
| Primary button hover | `#3B84BE` | Hover/pressed state on filled primary buttons |

**Status palette (dark)** — same three-part structure as light mode (tint / text-icon / solid marker), re-verified at the same WCAG thresholds against the dark surfaces above:

| State | Dark tint (background) | Text/icon on dark tint | Solid marker on dark surface |
|---|---|---|---|
| Open / normal | `#14261A` | `#7CD992` | `#4CAF6D` |
| Restricted | `#2B2210` | `#F4C24B` | `#E0A526` |
| High risk | `#2C1A10` | `#F2955C` | `#E1783B` |
| Blocked / critical | `#2C1414` | `#F28B82` | `#E5534B` |
| Unknown / offline | `#24272A` | `#B9BEC3` | `#8A8F94` |

Every text/tint pair above measures above 7:1 and every solid marker above 4:1 (all well past the 4.5:1 / 3:1 AA minimums), calculated the same way as the light-mode table in Section 5.1 — dark mode is not a lower-effort afterthought, it carries the identical accessibility bar.

Rules specific to dark mode:
- **Default is light mode.** Dark mode is opt-in or follows the device/OS setting — the platform never forces a theme on a user who hasn't chosen one.
- **Status colours keep their meaning across both themes.** Blocked is always some shade of red, open always some shade of green, in light or dark — a user who has learned the system in one theme should never have to relearn it in the other.
- **No pure black, no pure white.** Both the page background (`#101214`) and the primary text (`#F1F2F3`) stay just off the extremes — pure black-on-white or white-on-black creates a harsh vibration effect for many users, especially over long viewing sessions.
- **Maps and imagery get a dark basemap**, not a light map dropped onto a dark page — an inverted-looking screen (dark UI chrome around a blazing white map) undermines the entire point of the theme.

---

## 6. Key screens

### 6.1 Web — State view (home for state administrators)

The first screen anyone sees. Shows exactly what Section 17 specifies — connectivity status, at-risk community count, supply gaps, active missions, critical alerts — as large, glanceable numbers with a state map coloured by the five status colours. No table, no scrolling required to get the headline picture. Clicking any number goes straight to the filtered list behind it (e.g. "9 critical alerts" opens the alert queue, not a generic alerts tab).

### 6.2 Web — District → Community drill-down

Each level down adds detail, never replaces the map. The community screen shows accessibility percentage, days of supply remaining for tracked commodities, priority score, and — critically — **why** that priority score is what it is (see Section 7.3, Explainability). A district authority should never have to trust a number without being able to see what produced it.

### 6.3 Web — Mission approval screen

This is where the human-in-the-loop principle becomes a concrete interface. PRAVAH presents a recommended vehicle, route, and ETA with its reasoning visible by default (not behind a "details" click). Two buttons only: **Approve mission** and **View alternatives.** No mission proceeds without one of these being pressed by an authorised person; the screen makes that explicit rather than implying automation.

### 6.4 Web — Alerts panel

Alerts are grouped by priority (P0 critical down to P3 bulk/non-urgent), and every alert follows the same fixed structure so officers learn to scan it instantly: **what happened → how serious → what's affected → recommended action.** P0 alerts are visually separated at the top of the screen at all times, never buried in a mixed feed.

### 6.5 Mobile — Assigned mission

One card: destination, cargo, vehicle, ETA, and a map. A single prominent **Report a problem** button is always visible — a field officer should never have to search for how to report a blocked road. This is the single highest-value action in the entire mobile app and it gets the most prominent placement.

### 6.6 Mobile — Report incident

Three equally-sized input options — **voice, text, photo** — because literacy, language, and typing comfort vary widely across field officers. Voice is the primary path Gemma is designed to structure (Section 14), so it is never presented as a secondary or "advanced" option. After submitting, the officer sees an immediate local confirmation ("Saved — will send when connected") even with zero signal, so they never wonder whether their report was lost.

### 6.7 Mobile — Offline / sync status

Always visible, never hidden in a settings menu: last sync time, number of pending reports, and a plain-language state ("Working offline — 3 reports waiting to send"). This directly implements Section 19's rule that PRAVAH must never hide data staleness, translated into a UI element every screen carries.

---

## 7. Interaction patterns

### 7.1 Human-in-the-loop, made visible

Every recommendation in the UI is labelled as a recommendation ("PRAVAH recommends…") and every consequential action (mission approval, resource reassignment) requires an explicit confirmation step with the person's name and timestamp recorded and shown back to them. This isn't just an audit requirement — it builds the trust a government operator needs before acting on an AI-generated suggestion.

### 7.2 Errors and empty states

Errors are written in plain language, state what happened, and state what to do next — never a raw error code on its own. An empty state (e.g. "no active missions in this district") is treated as useful information, not a dead end — it confirms a healthy status rather than looking like something broke.

### 7.3 Explainability panel

Matches Section 33 directly. Any time PRAVAH recommends a route, vehicle, or priority ranking, a "Why this recommendation" panel is one click away (not buried) and shows the actual deciding factors in plain terms — e.g. "Route A rejected: bridge blocked. Route B selected: 63 min, low risk, vehicle compatible." No black-box numbers without an explanation a non-technical officer can read.

### 7.4 Notifications and alerts

Critical (P0) alerts interrupt — sound and visual on web, push notification on mobile. Lower-priority alerts (P2/P3) accumulate quietly in the alerts panel. This priority-based behaviour prevents alert fatigue, which is one of the most common reasons government dashboards get ignored in practice.

---

## 8. Accessibility specification

This platform is built for the Government of India and must meet **GIGW 3.0** (Guidelines for Indian Government Websites and Apps, issued by NIC/MeitY and adopted by DARPG) and its underlying standard, **WCAG 2.1 Level AA**. The following are treated as non-negotiable baseline requirements, not stretch goals:

- **Colour contrast:** minimum 4.5:1 for normal text, 3:1 for large text and UI components, in both standard and high-contrast display modes.
- **Never colour-only:** every status, alert, and map marker pairs colour with text and/or shape.
- **Keyboard and screen-reader navigable (web):** every control reachable and operable without a mouse; all images, icons, and map layers carry meaningful alt text or ARIA labels.
- **Touch targets (mobile):** minimum 44×44px, generously spaced — designed for use with wet hands, gloves, or in a moving vehicle, not just a careful tap in ideal conditions.
- **Text resize:** all screens remain usable with text scaled up to 200% without breaking layout or hiding content.
- **Captions and transcripts:** any voice-based field report processed by Gemma retains its transcript alongside the audio, so a later reviewer isn't dependent on listening to the original clip.
- **Multilingual by design, not by translation layer bolted on:** language is a first-class setting, not an afterthought. Initial coverage: English, Hindi, and Assamese, with the architecture (Gemma-assisted, Section 14) designed to extend to other NER languages as the platform scales. Numerals, dates, and units follow the selected language's convention.
- **Low-bandwidth and offline resilience:** every screen a field officer needs is usable offline (Section 19); nothing essential ever depends on a live connection to render.
- **Plain language throughout:** no bureaucratic or engineering jargon in front-line screens. "Bridge is blocked" not "Edge state: BLOCKED." Technical detail (confidence scores, model outputs) is available to coordinators who want it, but is never the default language shown to a field officer.
- **Consistent, predictable navigation:** the same action is always in the same place across screens (e.g. "Report a problem" never moves), so a low-digital-literacy user builds real muscle memory rather than re-learning the app each time.
- **Motion is never required to understand content**, and every animation respects `prefers-reduced-motion` (Section 5.7) — a user who disables motion loses nothing but the transition itself.

---

## 9. Content and writing guidelines

- **Active voice, plain verbs.** "Approve this mission," not "Mission submission may be authorized."
- **Name things the way users already think about them.** A field officer reports a "blocked road," not an "edge state transition." Technical vocabulary from the architecture doc stays in the architecture doc.
- **Consistent vocabulary end to end.** If a button says "Report a problem," the confirmation screen says "Problem reported" — never a different word for the same action.
- **No false certainty.** If PRAVAH is predicting, say "predicted" or "likely" with a confidence indicator — never present a forecast as a fact.
- **Every alert follows the same four-part structure** so it can be scanned, not read like prose: what happened → how serious → who/what is affected → what to do.

---

## 10. Responsive and device considerations

| Context | Design response |
|---|---|
| Command-centre large display | State view optimised for glance-from-distance: large type, high-contrast map, minimal text density |
| District office desktop/tablet | Full drill-down hierarchy, side-by-side list + detail panels |
| Low/mid-range Android in the field | Lightweight app, offline-first, single-task screens, large touch targets, minimal data usage per screen |
| Poor network (2G/patchy) | Every mobile screen renders from local cache first; sync happens silently in the background and is only ever shown, never blocking |

---

## 11. Accessibility & compliance checklist

Use this at every design review before a screen is considered done.

- [ ] Text contrast ≥ 4.5:1 (normal), ≥ 3:1 (large/UI)
- [ ] No information conveyed by colour alone
- [ ] All interactive elements keyboard-operable (web)
- [ ] All interactive elements ≥ 44×44px touch target (mobile)
- [ ] Screen-reader labels present on all icons, images, map layers
- [ ] Works at 200% text zoom without breaking layout
- [ ] Works fully offline for all field-officer-critical actions
- [ ] Every recommendation shows its reasoning within one click
- [ ] Every consequential action requires explicit human approval
- [ ] Plain-language copy reviewed against Section 9 guidelines
- [ ] Data staleness (last sync/update time) visible wherever live data is shown
- [ ] Tested in at least one regional language beyond English
- [ ] Buttons and links show visible default/hover/active/focus/disabled states (Section 5.6)
- [ ] Corner radius follows the shape scale — 4/6/8px, no unintended pill shapes (Section 5.5)
- [ ] Loading states use skeleton placeholders, never a blank or frozen screen
- [ ] All motion respects `prefers-reduced-motion`
- [ ] The same component (button, card, badge, status pill) looks and behaves identically everywhere it appears
- [ ] Screen re-checked in dark mode — same status meanings, same contrast minimums, no light-mode assets (e.g. a light map layer) left showing through

---

*This document should evolve alongside the architecture. If a new engine or feature is added to PRAVAH, its interface should be designed against Sections 2 and 8 of this file before a single screen is built.*
