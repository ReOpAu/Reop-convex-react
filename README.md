# React Starter Kit (RSK)

A modern, production-ready SaaS starter template for building full-stack React applications using TanStack Start, TanStack Router, Convex, Clerk, and Polar.sh. Ready for modern SSR deployment with built-in AI chat capabilities.

## Features

- 🚀 **TanStack Start + TanStack Router** - Modern full-stack React framework with SSR and file-based routing
- ⚡️ **Hot Module Replacement (HMR)** - Fast development experience
- 📦 **Asset bundling and optimization** - Production-ready builds
- 🔄 **Data loading and mutations** - Built-in loader/action patterns
- 🔒 **TypeScript by default** - Type safety throughout
- 🎨 **TailwindCSS v4** - Modern utility-first CSS
- 🔐 **Authentication with Clerk** - Complete user management
- 💳 **Subscription management with Polar.sh** - Billing and payments
- 🗄️ **Real-time database with Convex** - Serverless backend
- 🤖 **AI Chat Integration** - OpenAI-powered chat functionality
- 🎤 **ElevenLabs Voice AI** - Conversational voice agents with centralized configuration
- 🔊 **Cartesia Line Voice AI** - Alternative voice agent using Cartesia Line SDK (Python)
- 📊 **Interactive Dashboard** - User management and analytics
- 🎯 **Webhook handling** - Payment and subscription events
- 📱 **Responsive Design** - Mobile-first approach
- 🚢 **SSR Deployment Ready** - Built for Node/Docker and compatible SSR hosts

## Tech Stack

### Frontend
- **TanStack Start + TanStack Router** - Full-stack React framework and file-based router
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui** - Modern component library with Radix UI
- **Lucide React & Tabler Icons** - Beautiful icon libraries
- **Recharts** - Data visualization
- **Motion** - Smooth animations

### Backend & Services
- **Convex** - Real-time database and serverless functions
- **Clerk** - Authentication and user management
- **Polar.sh** - Subscription billing and payments
- **OpenAI** - AI chat capabilities
- **ElevenLabs** - Conversational voice AI with centralized configuration
- **Cartesia Line** - Alternative voice agent platform (Python SDK + Convex state bridge)

### Development & Deployment
- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Vercel** - Deployment platform

## Getting Started

### Prerequisites

- Node.js 18+ 
- Clerk account for authentication
- Convex account for database
- Polar.sh account for subscriptions
- OpenAI API key (for AI chat features)
- ElevenLabs account for voice AI (optional)
- Cartesia account + CLI for Cartesia voice agent (optional)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy the environment file and configure your credentials:

```bash
cp .env.example .env.local
```

3. Set up your environment variables in `.env.local`:

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

# OpenAI Configuration (for AI chat)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration (for voice AI)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
VITE_ELEVENLABS_ADDRESS_AGENT_ID=your_agent_id_here

# Cartesia Configuration (for Cartesia voice agent)
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_BRIDGE_SECRET=shared_secret_used_by_convex_and_cartesia_agent
VITE_CARTESIA_AGENT_ID=your_cartesia_agent_id_here

# Frontend URL for redirects
FRONTEND_URL=http://localhost:5173
```

4. Initialize Convex:

```bash
npx convex dev
```

5. Set up your Polar.sh webhook endpoint:
   - URL: `https://<your-convex-site>/payments/webhook`
   - Events: All subscription events

6. Configure admin access in Clerk:
   - Allow access when any one of the admin allowlists matches.
   - Or set Clerk metadata/session claims with `role`, `roles`, or `isAdmin` containing `admin`, `owner`, or `superadmin`.
   - Use `ADMIN_TOKEN_IDENTIFIER_ALLOWLIST` when your Convex token identifier differs from the Clerk user ID.

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## ElevenLabs Voice AI Configuration

This project includes a sophisticated ElevenLabs conversational AI integration with **centralized configuration management**. All agent configurations are version-controlled and synced programmatically - no manual UI updates required.

### Features
- 🎤 **Voice Conversational AI** - Natural voice interactions
- 🔧 **12 Client Tools** - Comprehensive address finder capabilities  
- 📝 **Centralized Configuration** - All agent settings in code
- 🔄 **Automated Sync** - Scripts to update ElevenLabs agents
- 🎯 **Zero Breaking Changes** - Built on existing integration

### Quick Start

The ElevenLabs configuration is already set up and ready to use:

```bash
# Download current agent configuration
npx tsx scripts/1-download-config.ts

# Preview configuration changes
npx tsx scripts/2-sync-agent.ts --dry-run

# Sync local config to ElevenLabs agent
npx tsx scripts/2-sync-agent.ts
```

### Configuration Files

```
ai/
├── master_prompt_base.txt     # Base agent prompt (7,474 chars)
└── tools.config.ts           # 12 tool definitions with Zod schemas

scripts/
├── env-loader.ts             # Custom .env.local reader
├── 1-download-config.ts      # Download agent config
└── 2-sync-agent.ts          # Bidirectional sync
```

### Daily Workflow

1. **Edit Configuration**: Modify `ai/tools.config.ts` or `ai/master_prompt_base.txt`
2. **Preview Changes**: Run `npx tsx scripts/2-sync-agent.ts --dry-run`
3. **Sync Live**: Run `npx tsx scripts/2-sync-agent.ts`

### Benefits

- ✅ **Single Source of Truth**: All 12 tools defined in `ai/tools.config.ts`
- ✅ **Version Control**: Agent configuration tracked in git
- ✅ **Type Safety**: Zod schemas prevent configuration errors
- ✅ **Zero Dependencies**: Custom environment loader (no dotenv needed)
- ✅ **Live Sync**: Verified with agent `agent_01jydc3p56er8tn495y66hybmn`

For complete documentation, see [`docs/elevenlabs-ai-in-local-code.md`](docs/elevenlabs-ai-in-local-code.md).

## Cartesia Line Voice Agent

An alternative voice-powered address finder at `/address-finder-cartesia` using the [Cartesia Line SDK](https://docs.cartesia.ai/line). The existing ElevenLabs `/address-finder` route is completely untouched.

### How It Works

- **Python agent** (`cartesia-agent/`) runs on Cartesia cloud with 9 loopback tools
- Tools call Convex HTTP API for address lookups (same backend as ElevenLabs)
- UI updates flow through a **Convex real-time subscription** state bridge (since Line SDK tools run server-side, not in the browser)
- Browser handles WebSocket audio (mic capture + playback) via `app/cartesia/` hooks
- Uses **Gemini 2.5 Flash** as the LLM (configurable to any LiteLLM-supported model)

### Quick Start

```bash
# 1. Install Cartesia CLI
curl -fsSL https://line.cartesia.ai/install.sh | bash
cartesia auth login <your_api_key>

# 2. Set agent environment variables
cartesia env set --agent-id=<AGENT_ID> \
  GEMINI_API_KEY=<your_key> \
  CONVEX_URL=https://your-deployment.convex.cloud

# 3. Deploy
cd cartesia-agent
cartesia deploy --agent-id=<AGENT_ID>

# 4. Set browser-side env vars in .env.local
# VITE_CARTESIA_AGENT_ID=<agent_id>
# Also set CARTESIA_API_KEY in Convex: npx convex env set CARTESIA_API_KEY=<key>

# 5. Visit /address-finder-cartesia
```

### Project Structure

```
cartesia-agent/               # Python agent (deployed to Cartesia cloud)
├── main.py                   # Agent entry point
├── tools.py                  # 9 loopback tools (address search, select, etc.)
├── config.py                 # System prompt, LLM model, voice config
├── requirements.txt          # cartesia-line, httpx
└── cartesia.toml             # Deployment config

app/cartesia/                 # Browser-side hooks and utilities
├── hooks/
│   ├── useCartesiaConversation.ts    # WebSocket lifecycle
│   ├── useCartesiaEventHandler.ts    # Convex subscription → store updates
│   └── useCartesiaAudioManager.ts    # Mic capture + audio playback
├── utils/
│   ├── audioEncoder.ts               # PCM encoding utilities
│   └── audioPlayer.ts                # Audio playback queue
└── types.ts                          # WS protocol + state bridge types

convex/cartesia/              # Convex backend
├── getAccessToken.ts         # Server-side token minting
└── sessionState.ts           # State bridge (push/get/clear mutations)
```

For comprehensive documentation, see [`cartesia-agent/README.md`](cartesia-agent/README.md).

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Node/Docker Deployment (Recommended)

This app is production-ready as a standard SSR Node service:

1. Build with `npm run build`
2. Start with `npm run start`
3. Put it behind your existing platform or reverse proxy

The repo includes a Dockerfile for container-based hosting, and the Vercel preset is only enabled when `VERCEL=1`.

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Architecture

### Key Routes
- `/` - Homepage with pricing
- `/pricing` - Dynamic pricing page
- `/dashboard` - Protected user dashboard
- `/dashboard/chat` - AI-powered chat interface
- `/dashboard/settings` - User settings
- `/success` - Subscription success page
- `/address-finder` - Voice AI address finder (ElevenLabs)
- `/address-finder-cartesia` - Voice AI address finder (Cartesia Line)
- `/health` - Plain-text health check endpoint
- Convex HTTP action `/payments/webhook` - Polar.sh webhook handler

### Key Components

#### Authentication & Authorization
- Protected routes with Clerk authentication
- Server-side user data loading with loaders
- Automatic user synchronization

#### Subscription Management
- Dynamic pricing cards fetched from Polar.sh
- Secure checkout flow with redirect handling
- Real-time subscription status updates
- Customer portal for subscription management
- Webhook handling for payment events

#### Dashboard Features
- Interactive sidebar navigation
- Real-time data updates
- User profile management
- AI chat functionality
- Subscription status display

#### AI Chat Integration
- OpenAI-powered conversations
- Real-time message streaming
- Chat history persistence
- Responsive chat interface

## Environment Variables

### Required for Production

- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `VITE_CONVEX_URL` - Your Convex client URL
- `VITE_CONVEX_SITE_URL` - Optional explicit Convex site URL for HTTP actions/webhooks
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `VITE_CLERK_FRONTEND_API_URL` - Clerk frontend API URL / domain used by `convex/auth.config.ts`
- `POLAR_ACCESS_TOKEN` - Polar.sh API access token
- `POLAR_ORGANIZATION_ID` - Your Polar.sh organization ID
- `POLAR_WEBHOOK_SECRET` - Polar.sh webhook secret
- `POLAR_SERVER` - `sandbox` for test mode, `production` for live billing
- `ADMIN_EMAIL_ALLOWLIST` - Comma-separated admin email allowlist
- `ADMIN_USER_ID_ALLOWLIST` - Comma-separated Clerk user ID allowlist
- `ADMIN_TOKEN_IDENTIFIER_ALLOWLIST` - Comma-separated Convex token identifier allowlist
- `OPENAI_API_KEY` - OpenAI API key for chat features
- `GOOGLE_MAPS_API_KEY` - Google Maps server-side API key
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps browser API key
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key for voice AI
- `ELEVENLABS_API_KEY` - ElevenLabs API key for sync scripts
- `VITE_ELEVENLABS_ADDRESS_AGENT_ID` - Your ElevenLabs agent ID
- `CARTESIA_API_KEY` - Cartesia API key (server-side, set in Convex env)
- `CARTESIA_BRIDGE_SECRET` - Shared secret required for Cartesia state bridge writes
- `VITE_CARTESIA_AGENT_ID` - Your Cartesia agent ID
- `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox token for listing map features
- `FRONTEND_URL` - Your production frontend URL

### Auth Expectations

- `/api/chat` and `/api/nearbyPlaces` require an authenticated Clerk/Convex request and return `401` otherwise.
- Those HTTP endpoints only allow the configured `FRONTEND_URL` as a cross-origin caller.
- Polar webhooks terminate at Convex `/payments/webhook`, not an app route.
- Read-only signed-in flows tolerate a missing Convex `users` row on first touch, but authenticated writes still bootstrap the row server-side through `api.users.upsertUser`.
- Cartesia browser sessions register through Convex, but only the Cartesia agent can push updates and it must present the shared `CARTESIA_BRIDGE_SECRET`.

## REOP Production Launch

For the `reop.com.au` cutover, use `https://reop.com.au` as the canonical origin and redirect `https://www.reop.com.au` to it. The app now supports a normal Node/Docker deploy by default, and billing/auth/data services should be cut over in the same window.

See [`docs/reop-production-launch.md`](docs/reop-production-launch.md) for the deployment topology, DNS shape, env checklist, webhook target, and smoke-test list.

## Project Structure

```
├── ai/                    # ElevenLabs AI configuration
│   ├── master_prompt_base.txt  # Base agent prompt
│   └── tools.config.ts    # Tool definitions with Zod schemas
├── app/
│   ├── cartesia/          # Cartesia Line browser-side integration
│   │   ├── hooks/         # WebSocket, event handler, audio manager
│   │   ├── utils/         # Audio encoding/playback utilities
│   │   └── types.ts       # WS protocol + state bridge types
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── address-finder/ # Voice AI address finder (ElevenLabs + Cartesia brains)
│   │   ├── homepage/      # Homepage sections
│   │   └── dashboard/     # Dashboard components
│   ├── routes/            # Route page modules used by `src/routes/*`
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state management
│   └── utils/             # Utility functions
├── src/
│   ├── routes/            # TanStack Router file routes and root route
│   ├── router.tsx         # Router creation with generated route tree
│   ├── start.ts           # TanStack Start server entry + Clerk middleware
│   └── routeTree.gen.ts   # Generated TanStack Router route tree
├── cartesia-agent/        # Cartesia Line Python agent (deployed to cloud)
│   ├── main.py            # Agent entry point
│   ├── tools.py           # 9 loopback tools
│   ├── config.py          # System prompt + LLM config
│   └── cartesia.toml      # Deployment config
├── convex/                # Convex backend functions
│   └── cartesia/          # Token minting + state bridge
├── scripts/               # ElevenLabs sync scripts
│   ├── env-loader.ts      # Custom environment loader
│   ├── 1-download-config.ts # Download agent config
│   └── 2-sync-agent.ts    # Sync local config to ElevenLabs
├── public/                # Static assets
└── docs/                  # Documentation
```

## Key Dependencies

- `react` & `react-dom` v19 - Latest React
- `@tanstack/react-start` & `@tanstack/react-router` - SSR framework and file-based routing
- `@clerk/tanstack-react-start` - Authentication
- `convex` - Real-time database
- `@polar-sh/sdk` - Subscription management
- `@ai-sdk/openai` & `ai` - AI chat capabilities
- `@elevenlabs/react` - Voice AI conversations
- `cartesia-line` - Cartesia Line Python SDK (in `cartesia-agent/`)
- `tailwindcss` v4 - Styling
- `@radix-ui/*` - UI primitives
- `zod` - Type-safe schema validation

## Scripts

### Development & Build
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript checks

### ElevenLabs Configuration Management
- `npx tsx scripts/1-download-config.ts` - Download current agent config
- `npx tsx scripts/2-sync-agent.ts --dry-run` - Preview config changes
- `npx tsx scripts/2-sync-agent.ts` - Sync local config to ElevenLabs agent

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

**Stop rebuilding the same foundation over and over.** RSK eliminates months of integration work by providing a complete, production-ready SaaS template with authentication, payments, AI chat, and real-time data working seamlessly out of the box.

Built with ❤️ using TanStack Start, TanStack Router, Convex, Clerk, Polar.sh, and OpenAI.
