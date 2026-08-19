from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import json
import asyncio
import cv2
import numpy as np

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
        # Convert bytes to numpy array then to OpenCV image
        # nparr = np.frombuffer(frame_bytes, np.uint8)
        # img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Here we would run YOLO/OpenCV object detection.
        # For MVP, we will simulate detecting an enemy if the frame isn't empty.
        
        # Simulated Vision Output:
        self.state["enemies"] = [
            {"x": 650, "y": 420, "confidence": 0.88}
        ]
        return self.state

class TacticalController:
    def __init__(self):
        self.current_strategy = "ENGAGE"

    def determine_action(self, game_state):
        # Extremely basic tactical loop: If there is an enemy, aim/shoot.
        if self.current_strategy == "ENGAGE" and len(game_state["enemies"]) > 0:
            enemy = game_state["enemies"][0]
            # Send a swipe command to move crosshair towards enemy, or tap to shoot.
            return {
                "type": "tap",
                "x": enemy["x"],
                "y": enemy["y"]
            }
        return None

engine = GameStateEngine()
controller = TacticalController()

@app.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Android Agent connected to Vision Server")
    try:
        while True:
            # 1. Receive Frame (Binary)
            frame_bytes = await websocket.receive_bytes()
            
            # 2. Vision Engine -> Game State
            state = engine.process_frame(frame_bytes)
            
            # 3. Tactical Controller -> Action
            action = controller.determine_action(state)
            
            # 4. Send action back to Android
            if action:
                await websocket.send_text(json.dumps(action))
                
    except WebSocketDisconnect:
        print("Android Agent disconnected")
    except Exception as e:
        print(f"Error in websocket loop: {e}")

@app.websocket("/ws/strategy")
async def strategy_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Node.js Strategic Agent connected")
    try:
        while True:
            # Receive strategy from Node.js (e.g. {"strategy": "ENGAGE"})
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if "strategy" in payload:
                    controller.current_strategy = payload["strategy"]
                    print(f"Strategy updated to: {controller.current_strategy}")
            except json.JSONDecodeError:
                pass
                
            # Periodically we could push game_state to Node.js here
            await websocket.send_text(json.dumps({"state": engine.state}))
            
    except WebSocketDisconnect:
        print("Strategic Agent disconnected")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
