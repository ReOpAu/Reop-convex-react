<objective>
Add loading skeletons and error boundaries to the listings feature. The current loading states are plain text ("Loading...", "Loading listing details...") with no visual structure. Replace these with skeleton placeholders that match the actual layout, and wrap key pages in error boundaries with retry capabilities.
</objective>

<context>
Read `./CLAUDE.md` for project conventions.

This is a React Router v7 app using TailwindCSS v4, shadcn/ui, and Convex for the backend. Convex queries return `undefined` while loading.

Key files to modify:
- `./app/features/listings/pages/ListingsOverviewPage.tsx` — Main listings grid page
- `./app/features/listings/pages/ListingDetailPage.tsx` — Single listing detail view
- `./app/features/listings/pages/MatchesPage.tsx` — Matches list page
- `./app/features/listings/pages/MatchDetailPage.tsx` — Individual match detail
- `./app/features/listings/components/ListingsDisplay.tsx` — Filter + grid wrapper
- `./app/features/listings/components/ListingsGrid.tsx` — Grid layout component
- `./app/features/listings/data/listingsService.ts` — Data hooks (provides isLoading states)

Reference for existing card layout:
- `./app/features/listings/components/ListingCard.tsx` — Card structure to mimic in skeleton

Do NOT modify:
- Convex backend files
- Route files (routes/listings/*)
- Types or data service hooks (just consume their isLoading states)
</context>

<requirements>

<skeleton_components>
Create skeleton components that match the actual rendered layout:

1. **ListingCardSkeleton** — Matches ListingCard layout:
   - Shimmer rectangle for the map area (h-64, rounded-t-2xl)
   - Shimmer pills for badges
   - Shimmer lines for headline (two lines, different widths)
   - Shimmer line for location
   - Shimmer line for price (wider, bolder feel)
   - Shimmer row for property icons (bed/bath/parking)
   - Use `animate-pulse` on `bg-gray-200 rounded` elements
   - Wrap in the same Card component with same dimensions as ListingCard

2. **ListingDetailSkeleton** — Matches ListingDetailPage layout:
   - Back button area (shimmer)
   - Breadcrumb shimmer
   - Two-column grid: main content (col-span-2) + sidebar (col-span-1)
   - Main: Large card skeleton with map placeholder, text blocks
   - Sidebar: Action card skeleton

3. **ListingsGridSkeleton** — Renders a grid of 6 ListingCardSkeletons in the same grid layout as ListingsGrid

Save all skeletons in: `./app/features/listings/components/skeletons/`
- `ListingCardSkeleton.tsx`
- `ListingDetailSkeleton.tsx`
- `ListingsGridSkeleton.tsx`
- `index.ts` (barrel export)
</skeleton_components>

<error_boundaries>
Create a reusable error boundary for listings pages:

1. **ListingsErrorBoundary** — A clean error state component:
   - Icon (AlertTriangle from lucide-react), heading, description
   - "Try again" button that calls a retry callback or reloads the page
   - Optional "Go back to listings" link
   - Minimal, clean styling consistent with the rest of the app
   - Save to: `./app/features/listings/components/ListingsErrorBoundary.tsx`

2. **Integration**: Use React Router's `errorElement` pattern or a simple conditional in each page component. Since Convex queries don't throw (they return undefined for loading, and the query itself handles errors), the error boundary should handle:
   - Invalid/missing listing IDs (already partially handled, but improve the UI)
   - Cases where a query returns data but the listing doesn't exist
   - Unexpected render errors
</error_boundaries>

<integration>
Wire the skeletons and error boundaries into existing pages:

1. **ListingsDisplay.tsx**: Replace `<div className="text-center py-8">Loading...</div>` with `<ListingsGridSkeleton />`

2. **ListingDetailPage.tsx**: Replace the `Loading listing details...` Alert with `<ListingDetailSkeleton />`. Replace the "Listing not found." Alert with the error boundary component.

3. **MatchesPage.tsx** and **MatchDetailPage.tsx**: Add appropriate loading states (read these files first to understand their current structure).
</integration>

</requirements>

<constraints>
- Tailwind CSS only — use `animate-pulse` for shimmer, `bg-gray-200 rounded` for skeleton shapes
- Use existing shadcn/ui Card component for skeleton wrappers to ensure consistent sizing
- Keep skeletons lightweight — no complex logic, just visual placeholders
- Match the exact layout dimensions of the real components so there's no layout shift when data loads
- Use lucide-react for any icons in the error boundary
</constraints>

<implementation>
1. Read ListingCard.tsx, ListingDetailPage.tsx, and ListingsGrid.tsx to understand exact layouts
2. Create the skeleton components in `./app/features/listings/components/skeletons/`
3. Create ListingsErrorBoundary.tsx
4. Integrate into each page, replacing plain text loading states
5. Review each modified page for consistency
</implementation>

<verification>
1. All new files have valid TypeScript
2. Skeleton layouts match the real component layouts (same grid columns, heights, padding)
3. No layout shift when data loads (skeletons same dimensions as real content)
4. Error boundary provides actionable options (retry, go back)
5. Run `npx @biomejs/biome check ./app/features/listings/` to verify formatting
</verification>

<success_criteria>
- Loading states feel polished and intentional, not like afterthoughts
- Users can see the shape of the content before it loads
- Error states are helpful and provide clear next steps
- No regressions in existing functionality
</success_criteria>
