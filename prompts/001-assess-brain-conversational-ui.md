<objective>
Thoroughly analyze the Zustand "brain" pattern and conversational UI implementation in the Address Finder feature. Assess architectural quality, identify strengths, weaknesses, and provide actionable recommendations.

This analysis will inform decisions about whether to refactor, simplify, or extend the current architecture.
</objective>

<context>
Read the CLAUDE.md for project conventions, especially the "Brain vs Widget Component Pattern" and "Information Flow Architecture" sections.

This project uses:
- React Router v7 with SSR
- Zustand for UI state (split across multiple stores)
- React Query for server/API state
- ElevenLabs for voice AI conversation
- A "Brain/Widget" component pattern where Brain components orchestrate state and Widgets are pure UI

The Address Finder is the most complex feature in the app: a voice-enabled, AI-assisted address search with manual input fallback, intent classification, address validation, search history, and suburb correction.
</context>

<research>
Read and analyze these files in order:

1. **Route entry point**:
   - `app/routes/address-finder.tsx`

2. **Brain component** (orchestration layer):
   - `app/components/address-finder/AddressFinderBrain.tsx`

3. **UI component** (presentation layer):
   - `app/components/address-finder/AddressFinderUI.tsx`

4. **All Zustand stores** (read every file):
   - `app/stores/uiStore.ts`
   - `app/stores/intentStore.ts`
   - `app/stores/apiStore.ts`
   - `app/stores/historyStore.ts`
   - `app/stores/searchHistoryStore.ts`
   - `app/stores/addressSelectionStore.ts`
   - `app/stores/addressFinderStore.ts`
   - `app/stores/types.ts`

5. **Key hooks used by the Brain**:
   - `app/hooks/useActionHandler.ts`
   - `app/hooks/useConversationLifecycle.ts`
   - `app/hooks/useAddressAutoSelection.ts`
   - `app/hooks/useAddressRecall.ts`
   - `app/hooks/useAddressSession.ts`
   - `app/hooks/useVelocityIntentClassification.ts`
   - `app/hooks/useAddressFinderActions.ts`

6. **Agent sync hook**:
   - `app/elevenlabs/hooks/useAgentSync.ts`

7. **Service layer** (if exists):
   - `app/services/address-search/AddressSearchService.ts`
   - `app/services/hooks/useAddressSearchService.ts`
</research>

<analysis_requirements>

Assess each of the following areas with specific evidence from the code:

### 1. Store Architecture Assessment
- How many Zustand stores exist and what does each own?
- Is there state duplication or overlap between stores?
- Are store boundaries well-defined (single responsibility)?
- Is `addressFinderStore.ts` still used or is it a leftover?
- Could any stores be merged or eliminated without losing clarity?
- Are there any stores that violate the "UI-specific state only" rule from CLAUDE.md?

### 2. Brain Component Assessment
- Does `AddressFinderBrain.tsx` follow the Brain pattern correctly?
- How many hooks does it import? Is this sustainable?
- Are there concerns about re-render cascading from multiple store subscriptions?
- Is the render-prop pattern (`children(handlers)`) the right choice vs context or composition?
- Are `any` types used where proper types should exist?
- Count the number of `useEffect` hooks - are any redundant or doing too much?

### 3. Data Flow Assessment
- Trace the flow: user action -> store update -> agent sync -> UI update
- Is there circular data flow or unnecessary indirection?
- Does the React Query usage follow best practices or is it being misused?
- Is the "sync React Query state to stores" pattern (line ~243 in Brain) an anti-pattern?
- Are there race conditions possible between voice input, manual input, and agent responses?

### 4. UI Component Assessment
- Does `AddressFinderUI.tsx` import any stores directly (it shouldn't)?
- Is the props interface too large? Count the props.
- Are there presentation concerns mixed with logic?
- Is the debug logging (useRef for intent change) appropriate for production?
- How much JSX is in AddressFinderUI - should it be further decomposed?

### 5. Handler Interface Assessment
- Count the handlers passed from Brain to UI
- Are handlers well-named and self-documenting?
- Is the `AddressFinderBrainHandlers` interface manageable or bloated?
- Could the interface be simplified (e.g., grouping related handlers)?

### 6. Information Flow to Agent Assessment
- What state gets synced to the AI agent?
- Does it follow the rule: "Only business-critical information flows to AI agents"?
- Are cosmetic states being synced (violation of CLAUDE.md)?
- Is `syncToAgent()` called at the right times and not too frequently?

### 7. Complexity & Maintainability
- Estimate cognitive load for a new developer reading this code
- Identify the top 3 most complex/confusing parts
- Are there dead code paths or commented-out code?
- How testable is this architecture?

</analysis_requirements>

<output_format>
Save the analysis to `./analyses/001-brain-conversational-ui-assessment.md` with this structure:

```markdown
# Address Finder Brain & Conversational UI Assessment

## Executive Summary
[2-3 sentence overview of findings]

## Architecture Scorecard
| Area | Score (1-5) | Key Finding |
|------|-------------|-------------|
| Store Architecture | X | ... |
| Brain Component | X | ... |
| Data Flow | X | ... |
| UI Component | X | ... |
| Handler Interface | X | ... |
| Agent Sync | X | ... |
| Maintainability | X | ... |

## Detailed Findings

### 1. Store Architecture
[Findings with specific file:line references]

### 2. Brain Component
[Findings with specific file:line references]

### 3. Data Flow
[Findings with specific file:line references]

### 4. UI Component
[Findings with specific file:line references]

### 5. Handler Interface
[Findings with specific file:line references]

### 6. Agent Sync
[Findings with specific file:line references]

### 7. Complexity & Maintainability
[Findings with specific file:line references]

## Top Recommendations
[Prioritized, actionable recommendations - max 5]
Each recommendation should include:
- What to change
- Why it matters
- Estimated effort (small/medium/large)
- Risk level (low/medium/high)

## Questions for the Developer
[2-3 questions that would inform deeper recommendations]
```
</output_format>

<verification>
Before completing the analysis:
- Confirm every Zustand store was read and assessed
- Confirm the Brain component's hook count and useEffect count are accurate
- Confirm whether AddressFinderUI imports any stores directly
- Confirm the handler count in the Brain-to-UI interface
- Verify all file:line references point to real code
</verification>

<success_criteria>
- All 7 assessment areas are covered with evidence from the actual code
- The scorecard provides at-a-glance understanding
- Recommendations are actionable and prioritized
- No speculative claims - every finding references specific code
- The analysis is useful for deciding next architectural steps
</success_criteria>
