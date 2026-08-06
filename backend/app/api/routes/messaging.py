import uuid
import asyncio
from datetime import datetime, UTC
from typing import List, Dict, Any, Set
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from ...database import get_db, SessionLocal
from ...dependencies import current_user, get_current_user_ws
from ...models import User, ChatMessage, ChatGroup, ChatGroupMember
from ...schemas import ChatMessageCreate, ChatMessageOut, ChatGroupCreate, ChatGroupOut, ReactionAdd, ConversationSummary

router = APIRouter()


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        # user_id -> set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # user_id -> set of user_ids they are currently typing to
        self.typing_status: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        self.typing_status.pop(user_id, None)

    async def send_to_user(self, user_id: str, message_data: dict):
        if user_id not in self.active_connections:
            return
        dead = set()
        for ws in list(self.active_connections[user_id]):
            try:
                await ws.send_json(message_data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active_connections[user_id].discard(ws)
        if not self.active_connections.get(user_id):
            self.active_connections.pop(user_id, None)

    async def broadcast_to_all(self, message_data: dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, message_data)

    async def broadcast_to_all_except(self, message_data: dict, exclude_user_id: str):
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user_id:
                await self.send_to_user(user_id, message_data)

    async def broadcast_message(self, message_data: dict, sender_id: str, receiver_id: str, is_group: bool):
        """Broadcast a message to all relevant recipients."""
        if is_group:
            # For group messages, broadcast to everyone connected
            await self.broadcast_to_all(message_data)
        else:
            # For direct messages, send to both sender and receiver
            await self.send_to_user(receiver_id, message_data)
            await self.send_to_user(sender_id, message_data)


manager = ConnectionManager()


async def _broadcast(message_data: dict, sender_id: str, receiver_id: str, is_group: bool):
    """Fire-and-forget helper used from sync REST endpoints."""
    await manager.broadcast_message(message_data, sender_id, receiver_id, is_group)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        from ...security import decode_token
        payload = decode_token(token)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user or not user.active:
            raise ValueError("Inactive or unknown user")
        user_dict = user.to_dict()
    except Exception as e:
        print(f"WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = user_dict["id"]
    user_name = user_dict.get("full_name") or user_dict.get("username", "Utilisateur")
    await manager.connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            # ── Ping / Pong keepalive ──────────────────────────────────
            if event_type == "ping":
                await websocket.send_json({"type": "pong"})

            # ── New message via WebSocket ──────────────────────────────
            elif event_type == "new_message":
                payload = data.get("payload", {})
                receiver_id = payload.get("receiver_id", "").strip()
                content = payload.get("content", "").strip()
                is_group = bool(payload.get("is_group", False))
                reply_to = payload.get("reply_to") or None

                if not content or not receiver_id:
                    await websocket.send_json({"type": "error", "message": "Contenu ou destinataire manquant."})
                    continue

                with SessionLocal() as db:
                    msg_id = f"msg-{uuid.uuid4().hex[:12]}"
                    new_msg = ChatMessage(
                        id=msg_id,
                        content=content,
                        sender_id=user_id,
                        receiver_id=receiver_id,
                        is_group=is_group,
                        timestamp=now_iso(),
                        read=False,
                        reply_to=reply_to,
                        reactions={}
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)

                    out_event = {
                        "type": "message_received",
                        "payload": {
                            "id": new_msg.id,
                            "content": new_msg.content,
                            "sender_id": new_msg.sender_id,
                            "receiver_id": new_msg.receiver_id,
                            "is_group": new_msg.is_group,
                            "timestamp": new_msg.timestamp,
                            "read": new_msg.read,
                            "reply_to": new_msg.reply_to,
                            "reactions": {},
                            "sender_name": user_name
                        }
                    }

                await manager.broadcast_message(out_event, user_id, receiver_id, is_group)

            # ── Typing indicator ──────────────────────────────────────
            elif event_type == "typing_start":
                target_id = data.get("target_id", "").strip()
                is_group = bool(data.get("is_group", False))
                if target_id:
                    typing_event = {
                        "type": "typing",
                        "sender_id": user_id,
                        "sender_name": user_name,
                        "target_id": target_id,
                        "is_typing": True
                    }
                    if is_group:
                        await manager.broadcast_to_all_except(typing_event, exclude_user_id=user_id)
                    else:
                        await manager.send_to_user(target_id, typing_event)

            elif event_type == "typing_stop":
                target_id = data.get("target_id", "").strip()
                is_group = bool(data.get("is_group", False))
                if target_id:
                    stop_event = {
                        "type": "typing",
                        "sender_id": user_id,
                        "sender_name": user_name,
                        "target_id": target_id,
                        "is_typing": False
                    }
                    if is_group:
                        await manager.broadcast_to_all_except(stop_event, exclude_user_id=user_id)
                    else:
                        await manager.send_to_user(target_id, stop_event)

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception:
        manager.disconnect(websocket, user_id)


# --- REST Endpoints (HTTP Fallback & API) ---

def build_conversations_for_user(db: Session, current_user_id: str) -> List[dict]:
    """Retrieve all direct user contacts and groups with last message and unread count as dicts."""
    summaries = []
    
    # 1. Add Chat Groups
    groups = db.query(ChatGroup).all()
    for g in groups:
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.receiver_id == g.id, ChatMessage.is_group.is_(True))
            .order_by(desc(ChatMessage.timestamp))
            .first()
        )
        unread_count = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.receiver_id == g.id,
                ChatMessage.is_group.is_(True),
                ChatMessage.sender_id != current_user_id,
                ChatMessage.read.is_(False)
            )
            .count()
        )
        summaries.append({
            "id": g.id,
            "name": g.name,
            "is_group": True,
            "avatar": None,
            "role": "CANAL",
            "last_message": last_msg.content if last_msg else "Canal de discussion initialisé",
            "last_timestamp": last_msg.timestamp if last_msg else g.created_at,
            "unread_count": unread_count
        })

    # 2. Add Direct Users (excluding current user)
    users = db.query(User).filter(User.id != current_user_id, User.active.is_(True)).all()
    for u in users:
        last_msg = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_group.is_(False),
                or_(
                    and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == u.id),
                    and_(ChatMessage.sender_id == u.id, ChatMessage.receiver_id == current_user_id)
                )
            )
            .order_by(desc(ChatMessage.timestamp))
            .first()
        )
        unread_count = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_group.is_(False),
                ChatMessage.sender_id == u.id,
                ChatMessage.receiver_id == current_user_id,
                ChatMessage.read.is_(False)
            )
            .count()
        )
        summaries.append({
            "id": u.id,
            "name": u.full_name or u.username,
            "is_group": False,
            "avatar": None,
            "role": u.role,
            "last_message": last_msg.content if last_msg else "Nouvelle conversation",
            "last_timestamp": last_msg.timestamp if last_msg else None,
            "unread_count": unread_count
        })
        
    summaries.sort(key=lambda c: c.get("last_timestamp") or "", reverse=True)
    return summaries

@router.get("/conversations", response_model=List[ConversationSummary])
def get_conversations(
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> List[ConversationSummary]:
    """Retrieve all direct user contacts and groups with last message and unread count."""
    summaries_dict = build_conversations_for_user(db, user_data["id"])
    return [ConversationSummary(**s) for s in summaries_dict]



@router.get("/{target_id}", response_model=List[ChatMessageOut])
def get_messages(
    target_id: str,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> List[ChatMessageOut]:
    """Get all messages for a specific conversation (user ID or group ID)."""
    current_user_id = user_data["id"]
    group = db.query(ChatGroup).filter(ChatGroup.id == target_id).first()
    
    if group:
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.receiver_id == target_id, ChatMessage.is_group.is_(True))
            .order_by(ChatMessage.timestamp.asc())
            .all()
        )
    else:
        msgs = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_group.is_(False),
                or_(
                    and_(ChatMessage.sender_id == current_user_id, ChatMessage.receiver_id == target_id),
                    and_(ChatMessage.sender_id == target_id, ChatMessage.receiver_id == current_user_id)
                )
            )
            .order_by(ChatMessage.timestamp.asc())
            .all()
        )
        unread_incoming = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_group.is_(False),
                ChatMessage.sender_id == target_id,
                ChatMessage.receiver_id == current_user_id,
                ChatMessage.read.is_(False)
            )
            .all()
        )
        if unread_incoming:
            for m in unread_incoming:
                m.read = True
            db.commit()

    user_ids = {m.sender_id for m in msgs}
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    name_map = {u.id: u.full_name or u.username for u in users}

    res: List[ChatMessageOut] = []
    for m in msgs:
        res.append(ChatMessageOut(
            id=m.id,
            content=m.content,
            sender_id=m.sender_id,
            receiver_id=m.receiver_id,
            is_group=m.is_group,
            timestamp=m.timestamp,
            read=m.read,
            reply_to=m.reply_to,
            reactions=m.reactions or {},
            sender_name=name_map.get(m.sender_id, "Utilisateur")
        ))
    return res


@router.post("", response_model=ChatMessageOut)
async def send_message(
    payload: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> ChatMessageOut:
    """Send a new message to a user or a group via HTTP, and broadcast via WebSocket."""
    current_user_id = user_data["id"]
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")

    msg_id = f"msg-{uuid.uuid4().hex[:12]}"
    new_msg = ChatMessage(
        id=msg_id,
        content=payload.content.strip(),
        sender_id=current_user_id,
        receiver_id=payload.receiver_id,
        is_group=payload.is_group,
        timestamp=now_iso(),
        read=False,
        reply_to=payload.reply_to,
        reactions={}
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    out = ChatMessageOut(
        id=new_msg.id,
        content=new_msg.content,
        sender_id=new_msg.sender_id,
        receiver_id=new_msg.receiver_id,
        is_group=new_msg.is_group,
        timestamp=new_msg.timestamp,
        read=new_msg.read,
        reply_to=new_msg.reply_to,
        reactions=new_msg.reactions or {},
        sender_name=user_data.get("full_name") or user_data.get("username")
    )

    # Broadcast via active WebSockets using proper async background task
    out_event = {"type": "message_received", "payload": out.model_dump()}
    await manager.broadcast_message(out_event, current_user_id, payload.receiver_id, payload.is_group)

    return out


@router.put("/{target_id}/read", status_code=204)
def mark_read(
    target_id: str,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> None:
    """Mark all messages from target_id as read."""
    current_user_id = user_data["id"]
    unread = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.sender_id == target_id,
            ChatMessage.receiver_id == current_user_id,
            ChatMessage.read.is_(False)
        )
        .all()
    )
    for m in unread:
        m.read = True
    db.commit()


@router.post("/{message_id}/reactions", response_model=ChatMessageOut)
async def toggle_reaction(
    message_id: str,
    payload: ReactionAdd,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> ChatMessageOut:
    """Add or remove an emoji reaction to a message."""
    current_user_id = user_data["id"]
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé.")

    reactions = dict(msg.reactions or {})
    emoji = payload.emoji.strip()
    users_who_reacted = list(reactions.get(emoji, []))

    if current_user_id in users_who_reacted:
        users_who_reacted.remove(current_user_id)
        if not users_who_reacted:
            reactions.pop(emoji, None)
        else:
            reactions[emoji] = users_who_reacted
    else:
        users_who_reacted.append(current_user_id)
        reactions[emoji] = users_who_reacted

    msg.reactions = reactions
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "reactions")
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    out = ChatMessageOut(
        id=msg.id,
        content=msg.content,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        is_group=msg.is_group,
        timestamp=msg.timestamp,
        read=msg.read,
        reply_to=msg.reply_to,
        reactions=msg.reactions or {},
        sender_name=sender.full_name if sender else "Utilisateur"
    )

    out_event = {"type": "reaction_updated", "payload": out.model_dump()}
    await manager.broadcast_message(out_event, msg.sender_id, msg.receiver_id, msg.is_group)

    return out


@router.delete("/{message_id}", status_code=200)
async def delete_message(
    message_id: str,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Soft-delete a message: replace content with '[Message supprimé]' and broadcast via WebSocket."""
    current_user_id = user_data["id"]
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message non trouvé.")
    if msg.sender_id != current_user_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos propres messages.")

    msg.content = "[Message supprimé]"
    msg.reactions = {}
    msg.reply_to = None
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(msg, "reactions")
    db.commit()
    db.refresh(msg)

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    out = ChatMessageOut(
        id=msg.id,
        content=msg.content,
        sender_id=msg.sender_id,
        receiver_id=msg.receiver_id,
        is_group=msg.is_group,
        timestamp=msg.timestamp,
        read=msg.read,
        reply_to=None,
        reactions={},
        sender_name=sender.full_name if sender else "Utilisateur"
    )

    out_event = {"type": "message_deleted", "payload": out.model_dump()}
    await manager.broadcast_message(out_event, msg.sender_id, msg.receiver_id, msg.is_group)

    return {"success": True, "id": message_id}


@router.post("/groups", response_model=ChatGroupOut)
def create_group(
    payload: ChatGroupCreate,
    user_data: dict[str, Any] = Depends(current_user),
    db: Session = Depends(get_db)
) -> ChatGroupOut:
    """Create a new chat group/channel."""
    current_user_id = user_data["id"]
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Le nom du groupe est requis.")

    group_id = f"group-{uuid.uuid4().hex[:10]}"
    new_group = ChatGroup(
        id=group_id,
        name=payload.name.strip(),
        created_at=now_iso()
    )
    db.add(new_group)
    db.add(ChatGroupMember(group_id=group_id, user_id=current_user_id))
    db.commit()
    db.refresh(new_group)

    return ChatGroupOut(
        id=new_group.id,
        name=new_group.name,
        created_at=new_group.created_at
    )
