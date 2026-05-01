# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `ReOpAu/react-starter-kit`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: read root `CONTEXT.md` and `docs/adr/` when present. See `docs/agents/domain.md`.

## Common Commands

### Development
```bash
npm run dev           # Start development server with HMR
npm run build         # Build for production
npm run start         # Start production server
npm run typecheck     # Run TypeScript checks and generate types
```

### Code Quality
```bash
npx @biomejs/biome check        # Run linting with Biome
npx @biomejs/biome check --fix  # Fix linting issues automatically
npx @biomejs/biome format       # Format code with Biome
```

### Convex Backend
```bash
npx convex dev        # Start Convex development server
npx convex deploy     # Deploy Convex functions to production
```

## Architecture Overview

### Tech Stack
- **Frontend**: TanStack Start on Vite with TanStack Router file routing and SSR
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Clerk for authentication and user management
- **Styling**: TailwindCSS v4 with shadcn/ui component library
- **State Management**: Zustand for UI state, React Query for server state
- **AI Integration**: OpenAI SDK with streaming chat capabilities
- **Payments**: Polar.sh for subscription management

### Key Architectural Patterns

#### Brain vs Widget Component Pattern
This codebase follows a strict separation between orchestration and interaction:

- **Brain Components** (`address-finder.tsx`, `dashboard/chat.tsx`): Orchestrate global state, handle agent sync, manage client tools
- **Widget Components** (`ManualSearchForm`, `AddressInput`): Self-contained UI components with minimal interfaces (≤3 props)
- **Display Components**: Pure presentation components with no state

**Critical Rule**: Only Brain components can import global stores or call `syncToAgent()`. Widgets communicate only through callbacks.

#### Information Flow Architecture
Only business-critical information flows to AI agents:
- ✅ **Sync to Agent**: User selections, intent changes, errors, completions
- ❌ **Never Sync**: Cosmetic states, animations, validation formatting, UI convenience

### Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (Radix + Tailwind)
│   ├── address-finder/ # Address finder widget components
│   ├── conversation/   # Chat interface components
│   └── dashboard/      # Dashboard-specific components
├── hooks/              # Custom React hooks
├── routes/             # Page modules consumed by `src/routes/*`
├── services/           # Centralized service layer
│   ├── address-search/ # Address search service (SLIP)
│   └── hooks/          # React hook wrappers for services
├── stores/             # Zustand stores for UI state
└── utils/              # Utility functions

src/
├── routes/             # TanStack Router file routes and root route
├── router.tsx          # Router creation with generated route tree
├── start.ts            # TanStack Start server entry + Clerk middleware
└── routeTree.gen.ts    # Generated TanStack Router route tree

convex/
├── address/            # Address & location services (consolidated)
│   ├── getPlaceSuggestions.ts   # Place autocomplete with intent
│   ├── validateAddress.ts      # Google Address Validation
│   ├── getPlaceDetails.ts      # Place details with coordinates
│   └── index.ts               # Consolidated API exports
├── schemas/            # Database schema definitions
│   ├── searches.ts           # Search history tracking
│   ├── userPreferences.ts    # User settings
│   └── index.ts             # Schema registration
├── testing/            # Comprehensive test utilities (762 test cases)
└── agentTools.ts       # Agent-facing mutation registry
```

#### Service Layer Pattern (SLIP)
The codebase uses a centralized service layer for complex business logic, transforming scattered code (45+ lines across 6 files) into single-line operations with architectural enforcement.

**Location**: `app/services/address-search/`

**Key Files**:
- `AddressSearchService.ts` - Singleton service with business rule enforcement
- `AddressCache.ts` - Centralized cache management (single source of truth for cache keys)
- `types.ts` - Domain types (SearchState, SelectionState, etc.)
- `errors.ts` - Domain errors with user-friendly messages
- `useAddressSearchService.ts` - React hook wrapper

**Usage**:
```typescript
// From client tools (singleton pattern)
const service = AddressSearchService.getOrInitialize(queryClient, stores);
const result = service.showOptionsAgain();

// From React components (hook pattern)
const { showOptionsAgain, canShowOptionsAgain } = useAddressSearchService();
```

**Business Rules Enforced**:
1. **Cache Preservation**: Selection never destroys original search results
2. **Complete Options**: "Show options again" returns ALL original suggestions
3. **Cache Consistency**: Cache keys normalized via single source of truth
4. **State Integrity**: Detects and recovers from state drift
5. **Error Clarity**: All errors provide user-friendly messages

**Performance Monitoring**:
```typescript
// Get comprehensive performance metrics
const metrics = service.getPerformanceMetrics();
// Returns: { avgOperationMs, operationCount, cache: { hitRate, hits, misses }, timing: {...} }
```

**Alert System** (threshold-based with severity levels):
```typescript
AddressSearchService.initialize(queryClient, stores, {
  enableStateValidation: true,
  enableLogging: true,
  maxOperationsBeforeReset: 10000,  // Memory management
  alerts: {
    slowOperationThresholdMs: 100,
    lowCacheHitRateThreshold: 0.5,
    highErrorRateThreshold: 0.1,
    alertCooldownMs: 30000,  // Prevents alert spam
    onAlert: (event) => {
      // event.severity: "info" | "warning" | "critical" (auto-calculated)
      if (event.severity === "critical") pagerduty.alert(event);
      analytics.track(event);
    }
  },
  onTelemetry: (event) => analytics.track(event),
});
```

**Alert Types**: `slow_operation`, `low_cache_hit_rate`, `high_error_rate`, `metrics_reset`

**Severity Calculation**: Automatic based on threshold deviation (1-2x = info, 2-5x = warning, >5x = critical)

## Development Guidelines

### Component Development
1. **Always start with purpose**: Define what the component does in one sentence
2. **Widget components**: Must be self-contained with own API calls, loading states, and error handling
3. **Use shadcn/ui pattern**: Base components on Radix UI primitives styled with Tailwind
4. **Icons**: Use `lucide-react` for all icons

### State Management
- **React Query**: Single source of truth for server state
- **Zustand**: UI-specific state only
- **Never include state setters in useEffect dependencies**
- **Hybrid mode**: `requestManualInput()` must not stop conversation, only enable manual input

### Styling Rules
- **Tailwind CSS only**: No inline styles or CSS-in-JS
- **Use tailwind-merge and clsx for conditional classes**
- **Biome formatting**: Uses tabs (not spaces) and double quotes

### Convex Backend Rules
- **New function syntax**: Always use modern Convex function definitions
- **Strict validation**: Always use argument and return validators
- **Agent tools**: Register all agent-facing mutations in `convex/agentTools.ts`
- **File-based routing**: Organize functions by domain (e.g., `address/`, `suburb/`)
- **Never use ctx.db in actions**: Use `ctx.runQuery`/`ctx.runMutation` instead

### API Usage Patterns
- **Convex actions in subfolders**: Use double-nested exports (e.g., `api.address.getPlaceSuggestions.getPlaceSuggestions`)
- **Check generated types**: Always verify correct structure in `convex/_generated/api.d.ts`

### AI Integration
- **ElevenLabs**: Requires dual-configuration in both `convex/agentTools.ts` and client tools
- **OpenAI**: Use streaming responses with proper error handling
- **Tool registration**: Agent tools must match between Convex exports and client configuration

### Type Safety
- **TypeScript strict mode**: All type checking enabled
- **Path aliases**: Use `~/*` for app imports
- **Validate external data**: Always validate API responses and user inputs

## Environment Setup

### Required Environment Variables
```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
VITE_CLERK_FRONTEND_API_URL=your_clerk_frontend_api_url_here
ADMIN_EMAIL_ALLOWLIST=admin@example.com
ADMIN_USER_ID_ALLOWLIST=user_123
ADMIN_TOKEN_IDENTIFIER_ALLOWLIST=https://clerk.your-instance/user_123

# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_ORGANIZATION_ID=your_polar_organization_id_here
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here
POLAR_SERVER=sandbox

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Maps Configuration
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Cartesia Configuration
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_BRIDGE_SECRET=shared_secret_used_by_convex_and_cartesia_agent
VITE_CARTESIA_AGENT_ID=your_cartesia_agent_id_here

# Application URL
FRONTEND_URL=http://localhost:5173
```

### Auth and Admin Notes
- Admin access is granted if any allowlist matches, or Clerk metadata/session claims expose `role`, `roles`, or `isAdmin` with `admin`, `owner`, or `superadmin`.
- Use `ADMIN_TOKEN_IDENTIFIER_ALLOWLIST` when Convex auth tokens identify users differently from Clerk's `userId`.
- `/api/chat` and `/api/nearbyPlaces` are authenticated HTTP endpoints. They return `401` without Clerk auth and only allow `FRONTEND_URL` as the CORS origin.
- `CARTESIA_BRIDGE_SECRET` must match between Convex and the Cartesia deployment. Never expose it to the browser.

### Development Workflow
1. Run `npm install` to install dependencies
2. Set up environment variables in `.env.local`
3. Run `npx convex dev` to start Convex backend
4. Run `npm run dev` to start development server
5. Use `npm run typecheck` before committing changes

## Testing Strategy
- **Component Testing**: Focus on widget components with isolated testing
- **Integration Testing**: Test Brain components with mock agents
- **E2E Testing**: Critical user flows through the application

## Deployment
- **Default host shape**: Standard Node SSR service, suitable for Docker-based platforms
- **Build/runtime config**: `vite.config.ts` uses `tanstackStart()` and `package.json` starts production with `pnpx srvx --prod -s ../client dist/server/server.js`
- **Environment**: Production builds require all environment variables set
- **Canonical production origin**: `https://reop.com.au`
- **Webhook target**: Polar posts to Convex `/payments/webhook`, not an app route
- **Runbook**: See `docs/reop-production-launch.md` for the REOP launch checklist

## Active Projects

### Address Finder Optimization Project (AFOP)
**Status**: ✅ **COMPLETED** - Major consolidation and cleanup finished
**Goal**: Optimize the existing address finder system for better maintainability, performance, and user experience.

#### ✅ **Completed Implementation**:
1. **Backend Consolidation** ✅ **COMPLETED**
   - ✅ Removed duplicate functions: `convex/suburbLookup.ts` (1,368 lines), `convex/addressFinder.ts` (156 lines), `convex/autocomplete.ts` (409 lines)
   - ✅ Eliminated `convex/suburb/*` directory and utilities (68 lines)
   - ✅ Standardized API patterns: All functions now use `api.address.*` structure
   - ✅ **Total cleanup**: 2,001 lines of duplicate code removed (58% reduction)

2. **Database Persistence Layer** ✅ **COMPLETED**
   - ✅ Added search history schema (`searches` table with user indexing)
   - ✅ Added user preferences schema (`userPreferences` table)
   - ✅ Schema properly registered in `convex/schemas/index.ts`
   - 🔄 **Next**: Implement mutations for `saveSearch`, `getUserSearchHistory`

3. **Frontend Component Architecture** ✅ **COMPLETED**
   - ✅ Clean `address-finder.tsx` with proper Brain/UI separation
   - ✅ `AddressFinderBrain.tsx` handles orchestration
   - ✅ `AddressFinderUI.tsx` handles presentation
   - ✅ Extracted specialized hooks: `useAddressRecall.ts`, `useAddressValidation.ts`
   - ✅ Maintains strict Brain/Widget architectural patterns

4. **Error Handling & Resilience** ✅ **COMPLETED**
   - ✅ Added automatic retry with exponential backoff (`app/utils/retryMechanism.ts`)
   - ✅ Implemented fallback search strategies in client tools
   - ✅ Enhanced error recovery for API calls and connection issues

5. **Additional Improvements** ✅ **COMPLETED**
   - ✅ Configurable VAD thresholds for ElevenLabs integration
   - ✅ Runtime validation for multi-agent transfer system
   - ✅ Comprehensive test coverage (762 validation test cases)
   - ✅ API naming conventions documented (`convex/NAMING_CONVENTIONS.md`)

#### 🔄 **Future Enhancements** (Optional):
- **Performance & Caching**: Multi-layer caching strategy for Google Places API
- **Analytics & Insights**: Search metrics tracking and dashboard at `/dashboard/address-analytics`

#### ✅ **Architecture Strengths Preserved**:
- Brain vs Widget component separation
- Intent classification system (suburb/street/address/general)
- ElevenLabs AI agent integration with client tools
- Hybrid mode functionality (voice + manual input)
- Australian-specific address validation

#### Key Files (Post-Cleanup):
- Frontend: `app/routes/address-finder.tsx`, `app/components/address-finder/*`
- Backend: `convex/address/*` (consolidated, 1,425 lines)
- Schemas: `convex/schemas/searches.ts`, `convex/schemas/userPreferences.ts`
- Testing: `convex/testing/*` (comprehensive validation test suite)

**Reference**: AFOP major cleanup completed. Address finder now has clean, maintainable architecture.

### Service Layer Implementation Project (SLIP)
**Status**: ✅ **COMPLETED** - Centralized service layer implemented and integrated
**Goal**: Replace scattered business logic with centralized, testable service layer to make features "trivial to implement and impossible to break"

#### ✅ **Completed Implementation**:

**Files Created** (`app/services/address-search/`):
- `AddressSearchService.ts` - Singleton service with business rule enforcement, telemetry, configurable validation
- `AddressCache.ts` - Centralized cache management (single source of truth for cache keys)
- `types.ts` - Domain types (SearchState, SelectionState, CacheKey, etc.)
- `errors.ts` - Domain errors with user-friendly messages and error context
- `index.ts` - Public exports

**Hook Created** (`app/services/hooks/`):
- `useAddressSearchService.ts` - React hook wrapper for component usage

**Integration Completed**:
- `showOptionsAgain` tool updated to use service (`useAddressFinderClientTools.ts`)
- Reduced from 45+ lines scattered across 6 files to ~15 lines using service

#### 🎯 **Business Rules Enforced**:
1. **Cache Preservation Rule**: Selection never destroys original search results
2. **Complete Options Rule**: "Show options again" always returns ALL original suggestions
3. **Cache Consistency Rule**: Cache keys normalized via `AddressCache.generateSearchCacheKey()`
4. **State Integrity Rule**: `validateStateIntegrity()` detects drift, `resyncFromStores()` recovers
5. **Error Clarity Rule**: All errors provide user-friendly messages via `toUserMessage()`

#### 🔧 **Configuration & Telemetry**:
```typescript
AddressSearchService.initialize(queryClient, stores, {
  enableStateValidation: true,  // Expensive, enable in dev only
  enableLogging: true,
  onTelemetry: (event) => {
    // Track: search_recorded, selection_recorded, show_options, state_resync, error
    analytics.track(event.type, event.details);
  },
});

// Get telemetry counters
const counters = service.getTelemetryCounters();
// { searches, selections, showOptions, resyncs, validationFailures, errors }
```

#### 📊 **Key Methods**:
```typescript
// Core operations
service.recordSearchResults(query, suggestions, context);
service.recordSelection(suggestion, context);

// Business capabilities
service.showOptionsAgain();           // Activate "show options" mode
service.getOptionsForCurrentSelection(); // Get all original suggestions
service.canShowOptionsAgain();        // Check if feature available
service.hideOptions();                // Return to confirmed selection

// State management
service.getCurrentSearch();           // Get current search state
service.getCurrentSelection();        // Get current selection state
service.validateStateIntegrity();     // Check store/service sync
service.resyncFromStores();           // Recover from state drift

// Telemetry
service.getTelemetryCounters();       // Get operation counts
service.updateConfig({ ... });        // Update config at runtime
```

**Reference**: See "Service Layer Pattern (SLIP)" section in Architecture Overview for usage examples.

## Common Pitfalls to Avoid
1. **Don't** import global stores in widget components
2. **Don't** sync cosmetic state changes to AI agents
3. **Don't** use string paths for Convex API calls
4. **Don't** include state setters in useEffect dependencies
5. **Don't** stop conversations when requesting manual input (hybrid mode)
6. **Don't** use inline styles - always use Tailwind classes
7. **Don't** create components with >3 props - split into Brain/Widget pattern
