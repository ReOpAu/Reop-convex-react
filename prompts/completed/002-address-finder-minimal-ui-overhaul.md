<objective>
Redesign the Address Finder UI with a minimal, clean aesthetic. Strip back visual noise, reduce color usage, increase whitespace, and simplify card structures. The voice controls and input area are the design anchor — redesign those first, then harmonize every other section of AddressFinderUI to match.

The goal is a premium, quiet interface that feels effortless to use. Think: Apple-level restraint. Every element earns its place.
</objective>

<context>
Read `./CLAUDE.md` for project conventions (Tailwind-only styling, shadcn/ui components, Brain/Widget pattern, lucide-react icons).

This is a React Router v7 app using TailwindCSS v4, shadcn/ui (Radix primitives), framer-motion, and lucide-react.

Key files to read and modify:
- `./app/components/address-finder/AddressFinderUI.tsx` — Main UI composition (primary target)
- `./app/components/address-finder/VoiceInputController.tsx` — Voice mic button and recording states
- `./app/components/address-finder/ManualSearchForm.tsx` — Manual address search with autocomplete
- `./app/components/address-finder/AddressInput.tsx` — The text input component
- `./app/components/address-finder/SelectedResultCard.tsx` — Confirmed address display
- `./app/components/address-finder/SuggestionsDisplay.tsx` — Suggestion list with confidence badges
- `./app/components/address-finder/HistoryPanel.tsx` — Conversation history

Do NOT modify:
- `./app/components/address-finder/AddressFinderBrain.tsx` (orchestration logic)
- Any store files, hook files, or Convex backend files
- The props interface of AddressFinderUI (keep the same contract with AddressFinderBrain)
</context>

<design_principles>
Apply these principles consistently across every change:

1. **Reduce color saturation** — Replace bg-blue-50, bg-green-50, bg-yellow-50 tinted cards with neutral backgrounds (bg-white, bg-gray-50/50, bg-muted). Use color sparingly and only for meaningful status (recording active, validation error, confirmed).

2. **Increase whitespace** — More generous padding and gaps. Let elements breathe. Use space-y-8 instead of space-y-6, p-6 instead of p-4 where appropriate.

3. **Simplify cards** — Remove double-card nesting. Reduce border prominence (border-transparent or border-muted). Consider using subtle shadows (shadow-sm) instead of colored borders for separation.

4. **Quiet typography** — Reduce font weight where possible. Use text-muted-foreground for secondary text. The page title should be understated (text-2xl font-medium, not text-3xl font-bold).

5. **Fewer badges** — Remove decorative badges. Keep only badges that convey actionable information (result count, recording status). Intent badges can become subtle inline text.

6. **Restrained emoji usage** — Replace emoji with lucide-react icons where appropriate. Emoji should only remain where they add genuine warmth (e.g., voice states). Replace technical emojis like robot faces with proper icons.

7. **Purposeful animation** — Keep framer-motion transitions but make them subtler. Reduce durations. Remove animate-pulse except for the recording indicator.
</design_principles>

<requirements>

<voice_controls_redesign>
Priority 1: Redesign VoiceInputController.tsx

Current: ShinyButton/RainbowButton with emoji labels.
Target: A single, prominent circular mic button that feels like a native voice interface.

- Idle state: Clean circular button (w-16 h-16 rounded-full) with a Mic icon (lucide-react), subtle border, bg-white
- Hover: Gentle scale transform (scale-105) and subtle shadow increase
- Recording state: Pulsing ring animation around the button (use a CSS ring/ping animation, NOT rainbow effects). The button should feel alive but not noisy. Use a single accent color (e.g., red-500 for the pulse ring, keeping the button itself clean)
- Replace RainbowButton and ShinyButton imports with standard Button or a custom styled div — unless they are used elsewhere. Keep the imports if they are shared components but stop using them here
- Keep VoiceIndicator integration when recording
- Add a small text label below the button: "Tap to speak" (idle) / "Listening..." (recording) in text-xs text-muted-foreground
</voice_controls_redesign>

<manual_input_redesign>
Priority 2: Clean up ManualSearchForm.tsx and AddressInput.tsx

- Remove the blue info box ("Hybrid Mode Active" / "AI Agent requested manual input") — replace with a minimal inline indicator: a small dot or subtle text line above the input
- Ensure the autocomplete dropdown matches the new minimal style: clean white background, no colored backgrounds per-item, subtle hover (bg-accent), clean separator lines
- The "voice conversation is active" placeholder state should be quieter — just centered text, no background card, no borders
- Keep all keyboard navigation and accessibility attributes unchanged
</manual_input_redesign>

<suggestions_redesign>
Priority 3: Simplify SuggestionsDisplay.tsx

- Replace colored background cards (bg-green-50, bg-blue-50, bg-yellow-50) per confidence level with a uniform clean card style. Differentiate confidence using a small colored dot only (the existing dot pattern is fine, just remove the background tinting)
- Remove the categories metadata line — it adds noise for most users
- Simplify the tip footer — make it lighter or remove it entirely
- Keep the ranking badges (#1, #2, etc.) but make them more subtle (text-muted-foreground, no outline border)
</suggestions_redesign>

<low_confidence_redesign>
Priority 4: Simplify the low confidence / auto-correction section in AddressFinderUI.tsx

- This section is currently very heavy (gradient backgrounds, multiple analysis blocks, emoji-heavy). Simplify dramatically:
  - Single clean card with a subtle left border accent (border-l-4 border-amber-400 for uncertain, border-l-4 border-blue-400 for correction)
  - Compact comparison: "You searched: X" → "Best match: Y" in a simple two-line layout, not a grid
  - Collapse the "Why I'm uncertain" analysis into a toggleable detail (use a `details/summary` or a small "Show details" button)
  - Reduce action buttons to two clean buttons without emoji
  - Remove the "Suggestions" tip box at the bottom or make it a single line of muted text
</low_confidence_redesign>

<selected_result_redesign>
Priority 5: Refine SelectedResultCard.tsx

- Reduce the green intensity — use a subtle green accent (border-l-4 border-green-500) instead of full bg-green-50 + bg-green-100 header
- Clean white card background
- Keep the CheckCircle icon but make it smaller and more integrated
- The map embed is fine — just ensure spacing is consistent with the new style
</selected_result_redesign>

<layout_and_chrome>
Priority 6: Overall layout refinements in AddressFinderUI.tsx

- Page header: Reduce to "Address Finder" (drop "Intelligent" and "v3"). Use text-2xl font-medium. Subtitle in text-sm text-muted-foreground.
- Status bar: Simplify — intent can be shown as plain text ("Searching for: suburb"), not a colored badge. Move "Previous Searches" and "Previous Selections" buttons to a subtle toolbar or dropdown, not inline with status.
- Modal overlays: Ensure the backdrop and modals match the cleaner aesthetic (rounded-xl, shadow-xl, clean close button)
- History panel: Should be visually quiet — consider collapsing it by default or making it a disclosure section
</layout_and_chrome>

</requirements>

<constraints>
- Tailwind CSS only — no inline styles, no CSS-in-JS
- Keep all existing functionality and interactivity intact
- Do not change prop interfaces or component contracts
- Do not modify AddressFinderBrain.tsx or any store/hook logic
- Use existing shadcn/ui components (Button, Card, Badge, Separator) — do not introduce new UI libraries
- Use lucide-react for any new icons
- Preserve all accessibility attributes (aria-*, role, etc.)
- Use tailwind-merge and clsx for conditional classes where already used
</constraints>

<implementation>
Work through the files in priority order (1-6). For each file:
1. Read the current file completely
2. Apply the minimal/clean redesign following the design principles
3. Verify no functionality is lost
4. Move to the next file

After all files are modified, do a final review pass on AddressFinderUI.tsx to ensure visual consistency across all the integrated sub-components.
</implementation>

<verification>
Before declaring complete:
1. Confirm all modified files still have valid TypeScript (no type errors introduced)
2. Confirm no props interfaces were changed
3. Confirm no store imports were added to widget components
4. Confirm all lucide-react icons used are imported
5. Run `npx @biomejs/biome check ./app/components/address-finder/` to verify formatting
</verification>

<success_criteria>
- Voice controls feel like a native, purpose-built voice interface (not a generic button)
- The entire UI reads as one cohesive, minimal design — no section feels visually heavier than another
- Color is used purposefully: recording (red pulse), confirmed (green accent), error (red text), and neutral everything else
- A user should feel calm using this interface, not overwhelmed by badges, colors, and emoji
</success_criteria>
