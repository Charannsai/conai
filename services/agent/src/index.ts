// ============================================================
// AI Mobile Operator — Agent Runtime Entry Point
// ============================================================
// Starts the WebSocket server and initializes the Groq client.
// This is the main process that bridges the web dashboard
// with the Android device via ADB.
// ============================================================

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables (support both .env and .env.local like Next.js)
const envLocalPath = path.resolve(process.cwd(), '../../.env.local');
const envPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to local package directory .env
  dotenv.config();
}
import { initGroqClient } from './ai/groq.js';
import { initTextClient } from './ai/textAgent.js';
import { AgentWebSocketServer } from './server/websocket.js';
import { getConnectedDevices } from './adb/device.js';

// ----------------------------------------------------------
// Configuration from environment
// ----------------------------------------------------------

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const WS_PORT = parseInt(process.env.WS_PORT || '4000', 10);
const ADB_DEVICE_ID = process.env.ADB_DEVICE_ID || 'auto';
const AGENT_MAX_STEPS = parseInt(process.env.AGENT_MAX_STEPS || '30', 10);
const AGENT_STEP_DELAY_MS = parseInt(process.env.AGENT_STEP_DELAY_MS || '1500', 10);
const AGENT_ACTION_TIMEOUT_MS = parseInt(process.env.AGENT_ACTION_TIMEOUT_MS || '5000', 10);

// ----------------------------------------------------------
// Startup
// ----------------------------------------------------------

async function main(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       AI Mobile Operator — Agent         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Validate API key
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is not set.');
    console.error('   Copy .env.example to .env and add your Groq API key.');
    console.error('   Get one free at: https://console.groq.com/keys');
    process.exit(1);
  }

  // Initialize Groq client
  initGroqClient(GROQ_API_KEY);
  initTextClient(GROQ_API_KEY);
  console.log(`✅ Groq client initialized (vision: ${GROQ_VISION_MODEL}, text: ${GROQ_TEXT_MODEL})`);

  // Check for connected devices
  try {
    const devices = await getConnectedDevices();
    if (devices.length === 0) {
      console.warn('⚠️  No Android devices detected.');
      console.warn('   Connect your phone via USB and enable USB debugging.');
      console.warn('   The agent will wait for a device when a task is started.');
    } else {
      console.log(`✅ Found ${devices.length} device(s): ${devices.join(', ')}`);
    }
  } catch (error) {
    console.warn('⚠️  ADB not found or not working.');
    console.warn('   Make sure Android SDK Platform Tools are installed and in PATH.');
  }

  // Start WebSocket server
  const server = new AgentWebSocketServer({
    port: WS_PORT,
    configuredDeviceId: ADB_DEVICE_ID,
    visionModel: GROQ_VISION_MODEL,
    textModel: GROQ_TEXT_MODEL,
    maxSteps: AGENT_MAX_STEPS,
    stepDelayMs: AGENT_STEP_DELAY_MS,
    actionTimeoutMs: AGENT_ACTION_TIMEOUT_MS,
  });

  console.log('');
  console.log(`🚀 Agent server running on ws://localhost:${WS_PORT}`);
  console.log(`📱 Device ID: ${ADB_DEVICE_ID}`);
  console.log(`🧠 Vision model: ${GROQ_VISION_MODEL}`);
  console.log(`📝 Text model: ${GROQ_TEXT_MODEL}`);
  console.log(`📊 Max steps: ${AGENT_MAX_STEPS}`);
  console.log('');
  console.log('Open the web dashboard at http://localhost:3000');
  console.log('');

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
