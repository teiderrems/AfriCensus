from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
from sqlalchemy.orm import Session
from sqlalchemy import select

from ...database import get_db
from ...models import Notification, User
from ...schemas import NotificationResponse
from ...dependencies import current_user, get_current_user_ws
from ...sse_manager import notification_manager

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    user: dict = Depends(current_user),
    db: Session = Depends(get_db)
):
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == user["id"])
        .order_by(Notification.created_at.desc())
    ).all()
    return notifications


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    user: dict = Depends(current_user),
    db: Session = Depends(get_db)
):
    notification = db.scalar(
        select(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == user["id"])
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification non trouvée")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.patch("/read-all", response_model=list[NotificationResponse])
def mark_all_notifications_as_read(
    user: dict = Depends(current_user),
    db: Session = Depends(get_db)
):
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == user["id"])
        .where(Notification.is_read == False)
    ).all()

    for notif in notifications:
        notif.is_read = True
        
    db.commit()
    return notifications



@router.get("/stream")
async def stream_notifications(request: Request, token: str):
    user = await get_current_user_ws(token)
    user_id = user["id"]

    async def event_generator():
        queue = await notification_manager.connect(user_id)
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            notification_manager.disconnect(user_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
