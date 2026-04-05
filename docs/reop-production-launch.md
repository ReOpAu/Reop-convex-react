# REOP Production Launch

## Recommended Topology

- Frontend and SSR: your existing Node/Docker hosting platform
- Canonical origin: `https://reop.com.au`
- Secondary domain: `https://www.reop.com.au`, redirected to the apex domain
- Realtime data and HTTP actions: Convex production deployment
- Auth: Clerk production instance aligned with the Convex auth provider
- Billing: Polar production with webhook delivery to Convex

This is the lowest-friction path because the app passes both `npm run typecheck` and `npm run build`, starts with `npm run start`, and now uses TanStack Start's Vite integration for SSR. The current build/runtime entrypoints are [`vite.config.ts`](../vite.config.ts) with `tanstackStart()` and the production `start` script in [`package.json`](../package.json).

## Required Config

### App Host

Set the production env vars for the app server and browser bundle on your host:

- `FRONTEND_URL=https://reop.com.au`
- `VITE_CONVEX_URL=<production convex cloud url>`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_FRONTEND_API_URL=<production clerk frontend api url or custom clerk domain>`
- `POLAR_ACCESS_TOKEN`
- `POLAR_ORGANIZATION_ID`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_SERVER=production`
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_MAPBOX_ACCESS_TOKEN`
- `VITE_ELEVENLABS_API_KEY`
- `ELEVENLABS_API_KEY`
- `VITE_ELEVENLABS_ADDRESS_AGENT_ID`
- `CARTESIA_API_KEY`
- `CARTESIA_BRIDGE_SECRET`
- `VITE_CARTESIA_AGENT_ID`

### Convex

- Create or confirm the production deployment with `npx convex deploy`
- Keep Convex env in sync with the same production values used by the app
- The authenticated HTTP endpoints in [`convex/http.ts`](../convex/http.ts) only allow the exact `FRONTEND_URL` origin, so `FRONTEND_URL` must be `https://reop.com.au`
- Polar webhooks land at `https://<deployment>.convex.site/payments/webhook`

If you only have the client URL, convert the host from `.convex.cloud` to `.convex.site` for webhook and HTTP action use.

### Clerk

- Add `https://reop.com.au` and `https://www.reop.com.au` to the production allowed origins and redirect URLs
- Ensure `VITE_CLERK_FRONTEND_API_URL` matches the Clerk frontend API URL or custom Clerk domain used by production
- Convex auth reads that value from [`convex/auth.config.ts`](../convex/auth.config.ts)

### Polar

- Switch to live billing with `POLAR_SERVER=production`
- Point the webhook at `https://<deployment>.convex.site/payments/webhook`
- The checkout success redirect is built from `FRONTEND_URL`, so production needs `FRONTEND_URL=https://reop.com.au`

### DNS

- Point the apex domain `reop.com.au` at your app host or load balancer
- Point `www.reop.com.au` at the same host
- Add a redirect from `www.reop.com.au` to `https://reop.com.au` at the edge, proxy, or app platform

## Launch Sequence

1. Deploy Convex production functions.
2. Configure production env vars on your app host.
3. Add the `reop.com.au` and `www.reop.com.au` domains on your app host.
4. Update Clerk production origins and redirect URLs.
5. Update Polar to production mode and set the Convex webhook URL.
6. Promote the app deployment after DNS is resolving correctly.

## Smoke Tests

Run these after the first live deploy:

- Visit `/` and `/pricing`
- Hit `/health`
- Sign in and verify Clerk redirects return to `https://reop.com.au`
- Open `/dashboard` and confirm the authenticated Convex queries succeed
- Trigger a Polar checkout and confirm the success page lands on `/success`
- Verify the webhook is received in Convex and the subscription status updates
- Test `/api/chat` and `/api/nearbyPlaces` from the browser on the live origin
- Exercise the address finder, map features, and any voice flows you plan to expose at launch

## Known Concerns

- The production build succeeds, but Vite reports very large client chunks, especially Mapbox and voice-related bundles. Not a hard blocker, but worth tightening after launch.
- The build also emits sourcemap-resolution warnings during bundling. They did not fail the build in the current run.
