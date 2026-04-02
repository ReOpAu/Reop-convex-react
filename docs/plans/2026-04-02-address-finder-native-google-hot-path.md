# Address Finder Native Google Hot-Path Migration

**Goal:** Remove Convex from the conversational address-finder hot path for Google Places and Address Validation calls, while keeping Convex for persistence, billing, and broader app state.

**Architecture:** The current `address-finder` flow is split between a browser-direct ElevenLabs session and Google lookups performed through Convex actions. We want to preserve the ElevenLabs browser connection, move Google calls onto native app-server endpoints, and keep the current client contracts stable during the migration.

**Tech Stack:** React Router v7 SSR, Convex, Clerk, ElevenLabs, Google Places API, Google Address Validation API, React Query

---

## Current Hot Path

### Voice / AI Conversation

- Browser microphone capture and session start:
  [app/hooks/useAudioManager.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/hooks/useAudioManager.ts#L37)
- ElevenLabs browser-side realtime session:
  [app/elevenlabs/hooks/useConversationManager.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useConversationManager.ts#L37)

### Google Address Calls

- Manual autocomplete uses Convex action:
  [app/components/address-finder/ManualSearchForm.tsx](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/components/address-finder/ManualSearchForm.tsx#L74)
- Agent tool calls use Convex actions:
  [app/elevenlabs/hooks/useAddressFinderClientTools.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts#L48)
- Selection flow does details enrichment then validation:
  [app/hooks/actions/selectionActions.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/hooks/actions/selectionActions.ts#L193)

---

## Target Hot Path

- Browser <-> ElevenLabs directly
- Browser -> native app `/api/address/*` endpoints -> Google APIs
- App -> Convex only for persistence/history/state that is not per-keystroke lookup

This removes one network/service hop from the Google path and lets us optimize the address flow without migrating the rest of the app off Convex.

---

## Phase 1: Shared Extraction

**Status:** Completed on 2026-04-02.

### Completed in Phase 1

- Moved the core Google search/scoring/validate-then-enrich helpers out of `convex/address/utils.ts` into:
  [shared/address/googleSearch.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/shared/address/googleSearch.ts)
- Added reusable Google Place Details helper:
  [shared/address/googlePlaceDetails.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/shared/address/googlePlaceDetails.ts)
- Added reusable Google Address Validation helper:
  [shared/address/googleAddressValidation.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/shared/address/googleAddressValidation.ts)
- Added native app-server wrapper for future route handlers:
  [app/lib/address/google-address.server.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/lib/address/google-address.server.ts)
- Kept current Convex runtime stable via compatibility shim:
  [convex/address/utils.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/convex/address/utils.ts)
- Switched Convex `getPlaceDetails` and `validateAddress` to call the extracted shared modules.

### Remaining Phase 1 Task

- Optionally switch `convex/address/getPlaceSuggestions.ts` to call the app-server wrapper contract or shared service directly for stricter parity with future route handlers.

---

## Phase 2: Native App Endpoints

**Status:** Completed on 2026-04-02.

### Completed in Phase 2

- Added native JSON route handlers for:
  - [app/routes/api.address.search.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/routes/api.address.search.ts)
  - [app/routes/api.address.details.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/routes/api.address.details.ts)
  - [app/routes/api.address.validate.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/routes/api.address.validate.ts)
  - [app/routes/api.address.select.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/routes/api.address.select.ts)
- Added request-schema validation and no-store JSON response helpers:
  - [app/lib/address/contracts.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/lib/address/contracts.ts)
  - [app/lib/address/api-route.server.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/lib/address/api-route.server.ts)
- Registered the new API endpoints and wired the previously added health route in:
  - [app/routes.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/routes.ts)
- Added a combined server-side selection service for future one-hop selection flow:
  - [app/lib/address/google-address.server.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/lib/address/google-address.server.ts)
- Expanded shared validation metadata so native routes can surface rural-exception details without duplicating Google requests:
  - [shared/address/googleAddressValidation.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/shared/address/googleAddressValidation.ts)

### Files to add

- `app/routes/api.address.search.ts`
- `app/routes/api.address.details.ts`
- `app/routes/api.address.validate.ts`
- `app/routes/api.address.select.ts`

### Endpoint Contracts

#### `POST /api/address/search`

- Input: `query`, `intent?`, `maxResults?`, `location?`, `radius?`, `isAutocomplete?`, `sessionToken?`
- Output: same shape as current Convex `getPlaceSuggestions`

#### `POST /api/address/details`

- Input: `placeId`, `sessionToken?`
- Output: same shape as current Convex `getPlaceDetails`

#### `POST /api/address/validate`

- Input: `address`
- Output: current Convex `validateAddress` shape plus top-level validation metadata (`isRuralException`, `validationGranularity`, `formattedAddress`, `placeId`, `location`)

#### `POST /api/address/select`

- Input: `placeId`, `description?`, `sessionToken?`
- Output: merged enrichment + validation response for the selection hot path

---

## Phase 3: Client Migration

### Migrate these callers first

- [app/components/address-finder/ManualSearchForm.tsx](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/components/address-finder/ManualSearchForm.tsx#L74)
- [app/elevenlabs/hooks/useAddressFinderClientTools.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts#L48)
- [app/hooks/useActionHandler.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/hooks/useActionHandler.ts#L101)

### Secondary callers

- `app/hooks/useAddressRecall.ts`
- `app/hooks/useEnhancedPlaceSuggestions.ts`
- `app/hooks/useSuburbAutocomplete.ts`
- `app/hooks/useSpellingAutocomplete.ts`
- `app/components/address-finder/CartesiaAddressFinderBrain.tsx`
- `app/routes/address-validation-tests.tsx`

### Client-side adapter

Add a thin adapter so the UI can swap transport without rewriting business logic:

- `app/services/address-api.client.ts`

This client should preserve existing response shapes so stores, React Query cache keys, and agent tools remain stable.

---

## Phase 4: Hot-Path Collapse

The current selection path does two sequential Google-oriented calls:

1. Place details enrichment
2. Address validation

That is visible in:
[app/hooks/actions/selectionActions.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/hooks/actions/selectionActions.ts#L196)

After native endpoints exist, consolidate those into `POST /api/address/select` so the UI and agent selection path pay for one server round trip instead of two.

---

## Phase 5: Convex Decommissioning For Google Lookups

Once all address-finder traffic is off Convex:

- Remove Convex actions for Google hot-path lookups
- Keep Convex for persistence, billing, subscriptions, and non-hot-path app state
- Keep ElevenLabs browser-direct, do not proxy voice audio through the app

---

## Guardrails

- Do not expose Google server keys to the browser
- Preserve Google session token behavior from:
  [app/hooks/useAddressSession.ts](/Users/stewartmilne/MetaBureau/REOPMAIN/react-starter-kit/app/hooks/useAddressSession.ts#L7)
- Add rate limiting before opening the new `/api/address/*` endpoints to public traffic
- Keep response contracts stable during migration to avoid breaking the conversational UI

---

## Success Criteria

- Manual autocomplete no longer hits Convex
- Agent search/selection no longer hits Convex for Google lookups
- The voice flow still talks directly from browser to ElevenLabs
- Selection confirmation requires fewer round trips
- Convex remains in use only where it actually adds value
