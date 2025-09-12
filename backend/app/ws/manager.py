from typing import Dict, List
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        self._boards: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, board_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._boards.setdefault(board_id, []).append(websocket)

    def disconnect(self, board_id: str, websocket: WebSocket):
        conns = self._boards.get(board_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns and board_id in self._boards:
            del self._boards[board_id]

    async def broadcast(self, board_id: str, message: dict, sender: WebSocket | None = None):
        conns = self._boards.get(board_id, [])
        to_remove: List[WebSocket] = []
        for ws in conns:
            if ws is sender:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                to_remove.append(ws)
        for ws in to_remove:
            self.disconnect(board_id, ws)

connection_manager = ConnectionManager()
