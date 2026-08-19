# AI Mobile Operator

An AI agent that can see and operate an Android phone through real touch interactions, using natural-language instructions.

## What It Does

You tell the agent:
> "Open YouTube and search for AI agents."

The agent observes the phone screen, understands the current UI, decides what action is required, performs the action, observes the result, and continues until the task is complete.

**Observe → Understand → Plan → Act → Verify → Repeat**

## Architecture

```
                    USER
                     │
                     ▼
             ┌───────────────┐
             │ Next.js Web UI│
             │ (port 3000)   │
             └───────┬───────┘
                     │
                  WebSocket
                     │
                     ▼
             ┌───────────────┐
             │ Agent Runtime  │
             │ (port 4000)   │
             │               │
             │ • Agent Loop  │
             │ • Groq AI     │
             │ • ADB Bridge  │
             └───────┬───────┘
                     │
                    ADB
                     │
                     ▼
             ┌───────────────┐
             │ Android Phone │
             └───────────────┘
```

## Prerequisites

1. **Node.js 18+** and **pnpm** installed
2. **Android SDK Platform Tools** (for ADB) — [Download](https://developer.android.com/tools/releases/platform-tools)
3. **Android phone** with USB Debugging enabled
4. **Groq API Key** (free) — [Get one here](https://console.groq.com/keys)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 3. Connect your Android phone

- Enable **Developer Options** on your phone
- Enable **USB Debugging**
- Connect via USB cable
- Accept the debugging prompt on your phone

Verify the connection:
```bash
adb devices
```

### 4. Start the application

```bash
pnpm dev
```

This starts both:
- **Web Dashboard** at `http://localhost:3000`
- **Agent Runtime** at `ws://localhost:4000`

### 5. Use the agent

1. Open `http://localhost:3000` in your browser
2. Verify your device shows as "Connected"
3. Type a task (e.g., "Open Calculator and calculate 25 × 16")
4. Click **Start Agent**
5. Watch the AI operate your phone!

## Example Tasks

- "Open Calculator and calculate 123 × 45"
- "Open Chrome and search for AI agents"
- "Open YouTube and search for AI agents"
- "Open Settings and navigate to About Phone"

## Tech Stack

| Component | Technology |
|-----------|-----------|
| AI Model | Qwen 3.6 27B (vision) via Groq |
| Web Dashboard | Next.js 15 + TypeScript + Tailwind CSS |
| Agent Runtime | Node.js + TypeScript |
| Phone Control | ADB (Android Debug Bridge) |
| Communication | WebSocket |
| All services | **Free tier** |

## Project Structure

```
conai/
├── packages/shared/     # Shared types & schemas
├── apps/web/            # Next.js dashboard
└── services/agent/      # Agent runtime (AI + ADB)
```

## Safety Features

- **Emergency Stop** button — immediately halts the agent
- **Action Validation** — rejects out-of-bounds coordinates and malformed inputs
- **Step Limit** — stops after 30 steps (configurable)
- **Stuck Detection** — warns AI when repeating the same action
- API key stays server-side only

## License

MIT
