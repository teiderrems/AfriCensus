import asyncio
from collections import defaultdict
import json

class NotificationManager:
    def __init__(self):
        self.connections: dict[str, list[asyncio.Queue]] = defaultdict(list)

    async def connect(self, user_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.connections[user_id].append(queue)
        return queue

    def disconnect(self, user_id: str, queue: asyncio.Queue):
        if user_id in self.connections:
            if queue in self.connections[user_id]:
                self.connections[user_id].remove(queue)
            if not self.connections[user_id]:
                del self.connections[user_id]

    async def broadcast(self, user_id: str, message: dict):
        if user_id in self.connections:
            for queue in self.connections[user_id]:
                await queue.put(message)

notification_manager = NotificationManager()
