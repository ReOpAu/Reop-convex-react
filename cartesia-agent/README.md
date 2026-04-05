# Cartesia Line Voice Agent — Address Finder

A Python voice agent built on the [Cartesia Line SDK](https://docs.cartesia.ai/line) that provides the same address-finding functionality as the ElevenLabs-powered `/address-finder` route, deployed as an isolated test at `/address-finder-cartesia`.

## Architecture

```
Browser (/address-finder-cartesia)          Cartesia Cloud               Convex
  |                                              |                         |
  |-- WS connect (access_token) --------------->|                         |
  |<-- ack + stream_id -------------------------|                         |
  |                                              |                         |
  |-- media_input (mic PCM base64) ------------>|                         |
  |                                     STT(Ink) -> LLM -> tool call      |
  |                                              |-- HTTP POST ---------->|
  |                                              |   getPlaceSuggestions  |
  |                                              |<-- suggestions --------|
  |                                              |                         |
  |                                              |-- HTTP POST ---------->|
  |                                              |   sessionState.push   |
  |   [Convex subscription fires]                |                         |
  |<======= real-time subscription ==============|=========================|
  |   [Browser updates RQ cache + Zustand]       |                         |
  |                                              |                         |
  |<-- media_output (agent speech base64) -------|                         |
```

### Key Architectural Difference from ElevenLabs

With **ElevenLabs**, client tools run **in the browser** and directly update React Query cache + Zustand stores.

With **Cartesia Line**, tools run **server-side in Python**. The browser receives state updates via a **Convex real-time subscription** (state bridge pattern) because the Line SDK does not support custom WebSocket events from loopback tools.

## Files

| File | Purpose |
|------|---------|
| `main.py` | Entry point — `VoiceAgentApp` with `LlmAgent` factory |
| `tools.py` | 9 loopback tools calling Convex HTTP API + state bridge |
| `intent_classification.py` | Parity-focused Cartesia intent classifier matching the shared TS rules |
| `config.py` | System prompt and LLM configuration |
| `requirements.txt` | Pinned Python dependencies (`cartesia-line==0.2.7`, `httpx==0.27.0`) |
| `cartesia.toml` | Cartesia CLI deployment configuration |
| `.env.example` | Environment variable template |

## Tools

The agent has 9 tools that mirror the ElevenLabs client tools:

### Core Search & Selection

| Tool | Description | ElevenLabs Equivalent |
|------|-------------|----------------------|
| `search_address(query)` | Search for places with intent classification. Dual validation for address intent (strict + loose fallback). Updates browser UI via Convex state bridge. | `searchAddress` |
| `select_suggestion(place_id)` | Confirm selection by place ID. Enriches with place details (coordinates, postcode). | `selectSuggestion` |
| `select_by_ordinal(ordinal)` | Select by "first", "second", "1", "2", etc. Maps to `select_suggestion`. | `selectByOrdinal` |

### State Management

| Tool | Description | ElevenLabs Equivalent |
|------|-------------|----------------------|
| `get_current_state()` | Returns session state (last query, suggestion count, selection). | `getCurrentState` |
| `clear_selection()` | Resets all state. User can start over. | `clearSelection` |
| `show_options_again()` | Re-displays previous suggestions after a selection was confirmed. | `showOptionsAgain` |

### Selection Workflow

| Tool | Description | ElevenLabs Equivalent |
|------|-------------|----------------------|
| `confirm_user_selection()` | Called after agent verbally acknowledges selection. | `confirmUserSelection` |
| `set_selection_acknowledged(acknowledged)` | UI sync flag for workflow control. | `setSelectionAcknowledged` |

### Input Mode

| Tool | Description | ElevenLabs Equivalent |
|------|-------------|----------------------|
| `request_manual_input(reason)` | Enables manual typing while keeping voice active (hybrid mode). | `requestManualInput` |

## State Bridge

Since loopback tools cannot emit custom WebSocket events to the browser, we use Convex as a real-time state bridge:

1. **Python tool** calls `_push_state_update(type, data)`.
2. This calls `POST {CONVEX_URL}/api/mutation` targeting `cartesia/sessionState:pushUpdate`.
3. Convex writes to the `cartesiaSessions` table with an incrementing version number.
4. The browser subscribes via `useQuery(api.cartesia.sessionState.getLatestUpdate, { sessionId })`.
5. The `useCartesiaEventHandler` hook processes new versions and updates Zustand stores + React Query cache.

### Update Types

| Type | Payload | Browser Action |
|------|---------|----------------|
| `suggestions` | `{ query, intent, suggestions[] }` | Populates React Query cache, updates intent/search stores |
| `selection` | `{ suggestion, query? }` | Runs the shared validated selection pipeline and preserves original query context |
| `show_options_again` | `{ query, intent, suggestions[] }` | Re-populates cache, clears selection, shows options |
| `selection_acknowledged` | `{ acknowledged: bool }` | Sets UI sync flag |
| `clear` | `{}` | Calls `clearSelectionAndSearch()`, resets UI flags |
| `request_manual_input` | `{ reason }` | Sets `agentRequestedManual` in UI store |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for the LLM |
| `CONVEX_URL` | Yes | Convex deployment URL (e.g., `https://your-deployment.convex.cloud`) |
| `CARTESIA_BRIDGE_SECRET` | Yes | Shared secret required for `cartesia/sessionState:pushUpdate` |
| `LLM_MODEL` | No | LiteLLM model string (default: `gemini/gemini-2.5-flash`) |

These are set on the Cartesia deployment, **not** in a local `.env` file (the deployment environment handles them):

```bash
cartesia env set --agent-id=<AGENT_ID> \
  GEMINI_API_KEY=<your_key> \
  CONVEX_URL=https://your-deployment.convex.cloud \
  CARTESIA_BRIDGE_SECRET=<shared_secret>
```

`CARTESIA_BRIDGE_SECRET` must match the secret configured in Convex. The browser never receives this value.

## Local Development

### Prerequisites

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- [Cartesia CLI](https://docs.cartesia.ai/line/cli): `curl -fsSL https://line.cartesia.ai/install.sh | bash`

### Run Locally

```bash
cd cartesia-agent

# Install dependencies
uv pip install -r requirements.txt

# Set env vars
export GEMINI_API_KEY=your_key
export CONVEX_URL=https://your-deployment.convex.cloud
export CARTESIA_BRIDGE_SECRET=shared_secret_used_by_convex_and_cartesia_agent

# Run the agent server
uv run python main.py
```

The agent starts a local WebSocket server. Test it with the Cartesia CLI:

```bash
cartesia chat 8000
```

### Deploy to Cartesia Cloud

```bash
# First time: authenticate
cartesia auth login <your_api_key>

# Set environment variables (persists across deployments)
cartesia env set --agent-id=<AGENT_ID> \
  GEMINI_API_KEY=<your_key> \
  CONVEX_URL=https://your-deployment.convex.cloud

# Deploy
cartesia deploy --agent-id=<AGENT_ID>

# Check status
cartesia status <AGENT_ID>
```

Deployments go to all 3 regions (US, EU, APAC) and typically take ~60 seconds.

### View Logs

Logs are visible in the Cartesia playground:
```
https://play.cartesia.ai/agents/<AGENT_ID>
```

## Frontend Integration

The browser-side code lives in the main React project:

```
app/
├── cartesia/
│   ├── types.ts                          # WS protocol + state bridge types
│   ├── hooks/
│   │   ├── useCartesiaConversation.ts    # WebSocket lifecycle
│   │   ├── useCartesiaEventHandler.ts    # Convex subscription → store updates
│   │   └── useCartesiaAudioManager.ts    # Mic capture + audio playback
│   └── utils/
│       ├── audioEncoder.ts               # Float32 ↔ Int16 PCM ↔ base64
│       └── audioPlayer.ts                # AudioContext playback queue
├── components/address-finder/
│   └── CartesiaAddressFinderBrain.tsx     # Brain component (Cartesia wiring)
└── routes/
    └── address-finder-cartesia.tsx        # Route (/address-finder-cartesia)

convex/
└── cartesia/
    ├── getAccessToken.ts                 # Server-side token minting
    └── sessionState.ts                   # State bridge (push/get/clear)
```

### Browser Authentication

1. Browser calls Convex action `cartesia.getAccessToken` which mints a short-lived JWT via `POST https://api.cartesia.ai/access-token` using the server-side `CARTESIA_API_KEY`.
2. Browser connects to `wss://api.cartesia.ai/agents/stream/{agent_id}?access_token={token}`.
3. Browser capture starts only after Cartesia returns an `ack` with a valid `stream_id`.

### Required Browser-Side Env Vars

```bash
# .env.local
VITE_CARTESIA_AGENT_ID=<your_agent_id>
```

Set these in Convex or the Cartesia deployment environment, not in the browser bundle:

```bash
npx convex env set CARTESIA_API_KEY=<your_api_key>
npx convex env set CARTESIA_BRIDGE_SECRET=<shared_secret>
cartesia env set --agent-id=<AGENT_ID> CARTESIA_BRIDGE_SECRET=<shared_secret>
```

## LLM Configuration

The agent uses [LiteLLM](https://docs.litellm.ai/) under the hood, so any LiteLLM-supported model works:

| Provider | Model String | Env Var |
|----------|-------------|---------|
| Google Gemini | `gemini/gemini-2.5-flash` | `GEMINI_API_KEY` |
| OpenAI | `openai/gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `anthropic/claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |

Set via `cartesia env set LLM_MODEL=openai/gpt-4o-mini OPENAI_API_KEY=sk-...`.

## System Prompt

The system prompt in `config.py` enforces the same voice interaction rules as the ElevenLabs agent:

- Never read addresses aloud (UI displays them)
- Never enumerate suggestions by voice
- Keep responses to one short sentence
- Use "options are on screen" instead of listing results
- After selection: say "Got it" — nothing more
- Ordinal selection rules (always use `select_by_ordinal` for "first", "second", etc.)
- Error recovery with fallback to manual input

## Known Limitations

1. **Extra latency**: The state bridge adds ~200-500ms vs ElevenLabs' direct browser store updates (Python tool → Convex HTTP → Convex subscription → browser).
2. **No live prompt variable sync**: Unlike ElevenLabs `window.setVariable`, Cartesia still relies on tool/state-bridge updates between turns rather than continuously pushing browser context into the LLM.
3. **Version coordination matters**: The browser WebSocket client and Convex access-token minting must stay on the same `Cartesia-Version` pin.
