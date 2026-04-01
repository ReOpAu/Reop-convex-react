<objective>
Implement API-driven intent verification for the Address Finder to achieve 99% classification accuracy instead of relying solely on client-side heuristics.

The goal is to use Google's type ( systemfrom API responses) as ground truth when classifying Listings, rather than relying on client-side prediction heuristics.
</objective>

<context>
This project uses:
- React Router v7 with SSR
- Zustand for UI state
- React Query for server state
- Google Places API via Convex backend
- The Address Finder feature classifies user searches as: suburb, street, address, or general

Currently, intent is predicted client-side using regex patterns and typing velocity. The backend already returns verified `resultType` from Google's type system but the client doesn't use it.

Relevant files to examine:
- @app/hooks/actions/selectionActions.ts - where selections are stored
- @app/stores/types.ts - Suggestion type definition
- @app/utils/addressFinderUtils.ts - classifySelectedResult function
- @convex/address/getPlaceSuggestions.ts - API response structure
</context>

<requirements>
Implement the following strategies in priority order:

1. **Post-result verification** - When storing a selection, use the API's verified `resultType` instead of the client-predicted intent. The backend already returns `resultType` in suggestions - extract and use it.

2. **Fallback to heuristics** - When API returns no results or no `resultType`, fall back to client-side prediction.

3. **Multi-result voting** (optional enhancement) - When multiple suggestions exist, determine verified intent by taking the most specific type across all results (address > street > suburb > general).

The key insight: The `Suggestion` type already has `resultType?: LocationIntent` field. The `classifySelectedResult()` function already uses API types. The fix is ensuring this verified type is used when saving to the database.

Specifically:
- In `selectionActions.ts`, when calling `storeSelectionAndSync()`, use the `result.resultType` from the API as the authoritative intent
- If `result.resultType` is undefined, fall back to the current `currentIntent` prediction
- Log when using verified vs predicted intent for debugging
</requirements>

<implementation>
Follow these steps:

1. First, examine how suggestions are stored in the React Query cache and whether `resultType` is preserved from the API response

2. In `selectionActions.ts` `storeSelectionAndSync` function:
   - Extract `result.resultType` as the verified intent
   - Use verified intent when calling `addAddressSelection`
   - Add logging to track: "Using verified intent: X" vs "Using predicted intent: Y"

3. Verify the Suggestion type in stores/types.ts includes `resultType` field

4. Test the flow by selecting various address types and confirming the correct intent is saved

Key principle: The heuristics should GUIDE the query (send intent to API), but the API response should VERIFY the intent (use resultType when storing).
</implementation>

<output>
Modify:
- `./app/hooks/actions/selectionActions.ts` - Use verified resultType when storing selections

Verify:
- `./app/stores/types.ts` - Suggestion type includes resultType
- Select an address and confirm the stored intent matches the API's resultType, not the prediction
</output>

<verification>
Before declaring complete:
1. Verify `resultType` is available on Suggestion objects from API
2. Test selecting a known address - confirm intent is "address"
3. Test selecting a suburb - confirm intent is "suburb"
4. Verify fallback works when API returns no resultType
5. Check logs show "Using verified intent" vs "Using predicted intent"
</verification>

<success_criteria>
- When selecting a result with valid `resultType`, that verified type is saved (not the client prediction)
- When `resultType` is undefined, client prediction is used as fallback
- Logging distinguishes between verified and predicted intent
- No regressions in existing selection flow
</success_criteria>
