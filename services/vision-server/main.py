from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json
import asyncio
import subprocess
import threading
import time

app = FastAPI()

class GameStateEngine:
    def __init__(self):
        self.state = {
            "app": "com.dts.freefireth",
            "player": {"health": 100, "armor": 100},
            "enemies": [],
            "ui": {"alive": True, "gameStarted": True, "gameOver": False},
            "timestamp": 0
        }

    def process_frame(self, frame_bytes: bytes):
        self.state["enemies"] = [
            {"x": 650, "y": 420, "confidence": 0.88}
        ]
        return self.state

class TacticalController:
    def __init__(self):
        self.current_strategy = "ENGAGE"

    def determine_action(self, game_state):
        if self.current_strategy == "ENGAGE" and len(game_state["enemies"]) > 0:
            enemy = game_state["enemies"][0]
            return {
                "type": "tap",
                "x": enemy["x"],
                "y": enemy["y"]
            }
        return None

engine = GameStateEngine()
controller = TacticalController()

web_clients = set()
agent_connected = False
adb_stream_task = None

async def adb_streamer():
    """Fallback continuous frame streamer via ADB when mobile app capture is idle."""
    global web_clients, agent_connected
    print("[VisionServer] Starting ADB live stream loop...")
    
    while True:
        if not web_clients:
            await asyncio.sleep(0.5)
            continue

        if agent_connected:
            # Native app is streaming at 60 FPS, pause ADB stream
            await asyncio.sleep(0.5)
            continue

        try:
            # Capture frame via ADB exec-out screencap directly into memory
            proc = await asyncio.create_subprocess_exec(
                "adb", "exec-out", "screencap", "-p",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()

            if stdout and len(stdout) > 100 and stdout[:4] == b'\x89PNG':
                # Broadcast frame bytes to all web clients
                disconnected = set()
                for client in list(web_clients):
                    try:
                        await client.send_bytes(stdout)
                    except Exception:
                        disconnected.add(client)

                for dc in disconnected:
                    web_clients.discard(dc)
        except Exception as e:
            pass

        # Smooth frame pacing
        await asyncio.sleep(0.08)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(adb_streamer())

@app.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket):
    global agent_connected
    await websocket.accept()
    agent_connected = True
    print("✅ Android Native Agent connected to Vision Server (60 FPS mode active)")
    try:
        while True:
            frame_bytes = await websocket.receive_bytes()
            
            # Forward live frame to all connected web clients
            disconnected_clients = set()
            for client in list(web_clients):
                try:
                    await client.send_bytes(frame_bytes)
                except Exception:
                    disconnected_clients.add(client)
            
            for dc in disconnected_clients:
                web_clients.discard(dc)
            
            state = engine.process_frame(frame_bytes)
            action = controller.determine_action(state)
            if action:
                await websocket.send_text(json.dumps(action))
                
    except WebSocketDisconnect:
        print("Android Native Agent disconnected")
    except Exception as e:
        print(f"Error in websocket loop: {e}")
    finally:
        agent_connected = False

@app.websocket("/ws/stream")
async def stream_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"Web Dashboard connected to live stream ({len(web_clients) + 1} total)")
    web_clients.add(websocket)
    try:
        while True:
            # Keep-alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("Web Dashboard disconnected from live stream")
        web_clients.discard(websocket)

@app.websocket("/ws/strategy")
async def strategy_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Strategic Agent connected")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if "strategy" in payload:
                    controller.current_strategy = payload["strategy"]
            except json.JSONDecodeError:
                pass
                
            await websocket.send_text(json.dumps({"state": engine.state}))
            
    except WebSocketDisconnect:
        print("Strategic Agent disconnected")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
