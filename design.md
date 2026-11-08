Capacity Connect — Product Design System
Purpose: This document is the visual and interaction source of truth for Capacity Connect. Read it before designing or changing any page. Apply the system consistently; do not treat it as a prompt to add decorative effects indiscriminately.

1. Product character
Capacity Connect is a thoughtful, modern SaaS product for nonprofit teams. It should feel:
- Confident and contemporary, like a well-funded software product.
- Human and optimistic, because the work is about people and communities.
- Structured and dependable, because users are nonprofit directors and staff handling real organizational responsibilities.
- Distinctive but restrained, with a recognizable visual identity rather than a generic AI-dashboard aesthetic.
The product sits between an editorial, mission-led brand and a capable professional workspace. Marketing pages can be expressive; authenticated product screens should prioritize clarity, focus, and useful information.
Design principles
1. Purpose before decoration. Every visual element must clarify content, hierarchy, action, or brand.
2. One coherent product. Marketing pages, onboarding, dashboard, chat, profile, and admin surfaces share the same design language.
3. Editorial warmth + SaaS precision. Pair expressive typography and generous space with precise grids, consistent controls, and disciplined data layouts.
4. Real content creates visual interest. Use meaningful interface previews, diagrams, resource examples, and purposeful photography—not random blobs or ornamental cards.
5. Restraint is a feature. Use gradients, motion, shadows, and accent colours sparingly.
6. Accessible by default. Maintain readable contrast, keyboard access, visible focus, sensible type sizes, and clear form labels.
2. Inspiration references and how to interpret them
Use the references as design direction, not as templates to copy.
A. Invofy — bold marketing composition and soft atmospheric colour
Reference:
https://lovable.dev/templates/apps/saas/invofy-smart-invoicing-platform-for-modern-freelancers-template

The supplied Invofy screenshot is a key reference for the public-facing landing page:
- Large, confident, tightly composed headline typography.
- Simple top navigation with a strong primary action.
- Centered hero message with concise supporting copy and two clear actions.
- Soft, blurred colour fields behind the content, with pink/coral and peach tones.
- Human imagery entering the composition from the lower edge, giving the page life and scale.
- Minimal visual clutter and clear contrast between the page background and dark text.
Adaptation for Capacity Connect: retain the bold headline scale, clear hero hierarchy, airy composition, and subtle atmospheric colour. Keep Capacity Connect’s own muted forest/sage identity; use warm coral, blush, or peach only as small supporting accents. Do not turn every page into a pink gradient.
B. Travel Companion — warm product experience and conversational workspace
Reference:
https://lovable.dev/templates/apps/saas/travel-companion

Useful characteristics:
- A warm, approachable palette and calm surfaces.
- A clear distinction between the marketing site and the authenticated application.
- A conversational AI interface paired with a structured secondary workspace.
- Collapsible navigation that gives the main task room to breathe.
- Useful prompt suggestions and helpful empty states that reduce the blank-page problem.
- Responsive layouts that preserve the task flow on smaller screens.
Adaptation for Capacity Connect: use the same clarity for the AI conversation experience. The chat should feel calm and focused, with a structured recommendation area that helps users act on the guidance. Do not copy travel imagery, itinerary metaphors, or destination UI.
C. Hireflow — operational clarity and information-dense internal tools
Reference:
https://lovable.dev/templates/apps/internal-tools/hireflow-full-stack-applicant-tracking-system-template

Useful characteristics:
- A clear information hierarchy for operational work.
- Consistent navigation and page structure.
- Tables, filters, status labels, timelines, and structured records used where they genuinely help.
- Clear separation between overview information and detailed records.
- Role-aware interfaces and deliberate permission boundaries.
Adaptation for Capacity Connect: use this discipline for the Capacity Canada admin area and data-heavy screens. Prioritize readable tables, meaningful filters, clear status indicators, and predictable page layouts. Do not turn the nonprofit dashboard into a KPI wall.
D. Neobrutal Landing Creator — distinctive graphic confidence
Reference:
https://lovable.dev/templates/apps/saas/neobrutal-landing-creator

Use this reference selectively for:
- Strong graphic hierarchy.
- Confident typography.
- Clear, high-contrast calls to action.
- Occasional bold borders or graphic blocks where they support the composition.
Adaptation for Capacity Connect: borrow the confidence, not the literal neo-brutalist treatment. The product should remain trustworthy and calm. Avoid harsh outlines on every element, excessive shadows, loud primary colours, or playful sticker-like decoration.
3. Brand direction
Overall visual idea
“Warm intelligence, made practical.”

Capacity Connect should combine:
- The warmth of a mission-led organization.
- The clarity of a modern productivity tool.
- The confidence of a polished technology brand.
The existing Capacity Connect landing-page direction—warm ivory, deep forest green, muted sage, editorial serif headlines, and subtle coral accents—is a strong starting point. Refine it consistently rather than replacing it with a completely unrelated visual identity.
Colour palette
Use CSS variables/design tokens. The values below are a starting palette; check contrast before finalizing text and interactive states.
Token	Suggested value	Use
--color-ink	#172E2B	Primary text, strong headings
--color-forest	#173B36	Primary brand actions, navigation accents
--color-forest-hover	#102E2A	Hover/active primary actions
--color-sage	#78988A	Secondary brand accents
--color-sage-soft	#E5EDE6	Soft surfaces, selected states
--color-ivory	#F7F7F1	Warm page background
--color-paper	#FFFFFF	Main content surfaces
--color-line	#DDE3DC	Borders and separators
--color-muted	#697570	Secondary text
--color-coral	#E99A80	Small highlights, notification accents
--color-peach-soft	#F8E9E1	Occasional warm callout surface
--color-success	#39765D	Success states
--color-warning	#A66B28	Warning states
--color-danger	#B64E4E	Destructive/error states


Rules:
- Use ivory or white as the dominant background; forest/ink for text.
- Primary buttons should use forest/ink with high-contrast text.
- Coral is an accent, not a second primary brand colour.
- Avoid rainbow gradients, saturated purple/blue SaaS defaults, and large areas of neon colour.
- Do not use colour alone to communicate status.
Typography
Use a deliberate two-family system:
- Display/headlines: an expressive editorial serif, such as DM Serif Display, Lora, or a similar restrained serif.
- Interface/body: a highly readable sans-serif, such as DM Sans, Inter, or Manrope.
Use one display family and one sans-serif family consistently. Do not mix multiple decorative fonts.

Typography guidance:
- Marketing hero headline: large, editorial, compact line-height; use serif selectively to create personality.
- Product page headings: clear sans-serif or restrained serif accent; smaller than marketing headlines.
- Body copy: readable, comfortable line-height, moderate measure.
- Labels and metadata: small but never faint or illegible.
- Avoid oversized text in every section. Reserve dramatic scale for the landing-page hero and a few important moments.
4. Layout, spacing, and shape
Layout system
- Use a consistent spacing scale based on 4px or 8px increments.
- Use a centered content container with a deliberate maximum width.
- Align content to a consistent grid; avoid arbitrary offsets.
- Use generous whitespace on marketing pages and tighter, more efficient spacing inside the application.
- Keep line lengths comfortable; avoid full-width paragraphs.
Corners and borders
- Use moderate corner radii consistently.
- Buttons and inputs should feel refined, not excessively pill-shaped by default.
- Cards should use subtle borders and restrained shadows.
- Prefer a fine border over a heavy shadow to separate surfaces.
- Use stronger borders only for intentional emphasis or a specific visual pattern.
Surfaces
Establish a small surface hierarchy:
1. Page background: ivory or very light neutral.
2. Main content surface: white or near-white.
3. Secondary surface: soft sage/neutral tint.
4. Emphasis surface: occasional warm peach/coral tint.
Do not wrap every paragraph or every small piece of content in its own card. Use cards only when grouping information or actions is genuinely useful.
5. Component standards
Navigation
- Public navigation: clean horizontal header, clear brand mark, a small number of links, and one obvious primary action.
- Authenticated navigation: stable sidebar on desktop; compact drawer/sheet on mobile.
- Highlight the current location clearly but quietly.
- Keep navigation labels short and predictable.
Buttons
Define primary, secondary, tertiary, and destructive variants.
- Primary: forest background, high-contrast text.
- Secondary: light surface with a fine border.
- Tertiary: text/ghost action for low-priority controls.
- Destructive: reserved for irreversible actions and paired with confirmation where appropriate.
Buttons need clear hover, focus, disabled, and loading states. Avoid oversized buttons everywhere.
Forms
- Always use persistent labels; placeholders are not labels.
- Group related fields and explain why sensitive or unusual information is requested.
- Use consistent input heights, border styles, and focus rings.
- Show validation beside the relevant field in plain language.
- Preserve entered values when validation fails.
- Make multi-step onboarding show progress, current step, and a clear way to go back.
Cards and panels
- Use cards for distinct tasks, records, or grouped summaries.
- Maintain consistent internal padding.
- Avoid a grid of identical cards when a list, section, or simple text block would be clearer.
- Do not add decorative icons to every card.
Icons
- Use one consistent icon family (Lucide is appropriate).
- Icons should clarify actions or categories.
- Avoid emoji as interface icons.
- Do not use icons as decoration where text already communicates the meaning.
Tables and data
- Use tables for comparable records and operational lists.
- Keep headers clear and aligned with values.
- Use restrained row separators and legible density.
- Provide useful empty, loading, and error states.
- Never invent statistics, organization counts, testimonials, or activity data.
6. Page-specific direction
A. Public landing page
The landing page should combine the Capacity Connect brand with the confident composition of Invofy.

Suggested structure:
1. Header with logo, a few meaningful navigation links, Log in, and Get started.
2. Hero section with a strong concise headline, one short supporting paragraph, and one primary action plus one secondary action.
3. A purposeful visual: an actual product interface preview, a thoughtful illustration about connected support, or authentic human/community imagery.
4. A clear explanation of how Capacity Connect works.
5. Core value/features, expressed through varied layouts rather than identical cards.
6. A section explaining the value to nonprofit organizations.
7. A final call to action and restrained footer.
Hero rules:
- Use bold, confident typography and generous negative space.
- The headline should communicate a clear outcome, not generic AI claims.
- The visual should support the message rather than compete with it.
- Soft atmospheric colour can sit behind the hero, but text must remain readable.
- Avoid fake customer logos, fabricated testimonials, and invented impact numbers.
B. Login and registration
- Keep the account journey focused and reassuring.
- Clearly distinguish Nonprofit Staff from Capacity Canada Admin login.
- Make the nonprofit orientation a guided multi-step process.
- Show progress and the purpose of the questions.
- Use a split layout or a quiet brand panel only if it improves the experience; do not force a decorative side panel onto every form.
- Maintain consistent field widths and vertical rhythm.
C. Nonprofit Staff dashboard
The dashboard is a practical starting point, not a marketing page.
- Use an application shell with a stable sidebar and clear page header.
- Give the main action—starting or continuing an AI conversation—strong visual priority.
- Show recent conversations as a useful list with titles and dates.
- Show relevant organization context only where it helps the user.
- Keep the page calm and uncluttered.
- Avoid meaningless KPI cards, fake activity feeds, and empty charts.
D. AI assistant / conversation workspace
The chat should be the most carefully considered product interface.
- Provide a focused conversation column with comfortable reading width.
- Use clear but understated distinction between user and assistant messages.
- Render AI responses with strong typographic hierarchy and readable sections.
- Present “Identified Challenges,” “Recommended Strategies,” “Relevant Resources,” and “Best Recommended Next Step” as structured content—not four oversized decorative cards.
- Keep the message composer anchored and easy to use.
- Provide a helpful first-use empty state with a few realistic example prompts.
- Make conversation history accessible without crowding the active conversation.
- On wide screens, a secondary context or recommendation panel may be used only when it adds real value.
- On mobile, prioritize the conversation and make history/navigation accessible through a drawer.
E. Profile
- Present personal details and organization details in clearly separated sections.
- Make edit/save states obvious.
- Display orientation answers in a readable form, not a dense data table.
- Clearly distinguish view mode from edit mode.
- Show save confirmation and validation errors accessibly.
F. Capacity Canada admin
Use Hireflow as inspiration for operational clarity, not its recruiting-specific visuals.
- Use a professional application shell with predictable navigation.
- Use tables, filters, and status indicators where they help manage real records.
- Prioritize readable information hierarchy and clear actions.
- Use restrained data visualization only when real data exists.
- Keep admin screens efficient and trustworthy rather than decorative.
7. Motion and visual effects
Motion should make the interface easier to understand, not make it feel animated for animation’s sake.

Good uses:
- Short transitions for menus, dialogs, tabs, and accordions.
- Subtle entrance transitions for a landing-page hero or section when they do not delay content.
- Clear loading indicators and button progress states.
- Small hover feedback on interactive elements.
Avoid:
- Constant floating or pulsing decorations.
- Scroll-jacking and excessive parallax.
- Auto-moving carousels that distract from reading.
- Large animated gradients.
- Long page-load animations.
- Motion that causes layout shift or interferes with keyboard/screen-reader use.
Respect prefers-reduced-motion.
8. Responsive behaviour
Design for mobile, tablet, laptop, and wide desktop—not just shrink desktop layouts.
- Public navigation should collapse cleanly on mobile.
- Hero typography should scale fluidly and avoid awkward line breaks.
- Forms should fit narrow screens without horizontal scrolling.
- Sidebar navigation should become a drawer or compact navigation pattern.
- Chat should remain comfortable to read and use on mobile.
- Tables should use responsive alternatives where necessary, not simply overflow off-screen.
- Maintain touch-friendly control sizes.
9. Anti-patterns: what makes a product look “vibe coded”
Avoid these patterns deliberately:
- A hero made of generic headline + three gradient blobs + random floating glass cards.
- The same three-column card grid repeated in every section.
- Every element having a large border radius, shadow, and gradient.
- Random pastel colours with no semantic role.
- Emoji used as icons or illustrations.
- Decorative charts with arbitrary values.
- Fake testimonials, fake partner logos, fake customer counts, or invented impact metrics.
- Generic AI sparkle icons repeated throughout the product.
- Overuse of glassmorphism, blur, neon gradients, and floating panels.
- Inconsistent spacing, arbitrary font sizes, and too many font families.
- Dense dashboards filled with metrics that do not help the user.
- UI that looks polished in a screenshot but has no clear hierarchy or usable interaction states.
- Replacing meaningful content with placeholder copy or static mockups.
- Adding unnecessary animation to make a page appear more sophisticated.
A design is not finished because it looks impressive in one screenshot. It must also be coherent, accessible, responsive, and easy to use.
10. Implementation rules for GitHub Copilot
When asked to implement or redesign a page:
1. Read this entire document first.
2. Inspect the existing components, routes, styles, and design tokens before editing.
3. Reuse and extend existing design tokens and components instead of creating parallel systems.
4. Follow the page-specific guidance above.
5. Make design decisions based on the actual content and task—not by applying a generic dashboard template.
6. Preserve all working functionality, authentication, database behaviour, and API integrations.
7. Do not replace real data or functional interactions with static mockups.
8. Do not introduce new dependencies for visual effects unless there is a clear need.
9. Build responsive, accessible states—not only the desktop default state.
10. After implementation, inspect the affected pages at desktop and mobile widths and fix inconsistencies.
Definition of done
A page is complete only when:
- It clearly belongs to the Capacity Connect product.
- Its hierarchy makes the primary task obvious.
- Typography, spacing, colour, and components follow this system.
- It uses real content and meaningful interface elements.
- It works at mobile and desktop sizes.
- Interactive, loading, empty, error, and focus states are considered.
- Existing application functionality still works.
Reference links
- Neobrutal Landing Creator
- Travel Companion
- Invofy
- Hireflow