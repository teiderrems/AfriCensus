from app.dependencies import current_user
from app.database import get_db
from app.models import User
from app.email_service import send_support_ticket_email
from app.models import SupportTicket
from app.schemas import SupportTicketCreate
from app.schemas import SupportTicketOut
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException


router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.post("", response_model=SupportTicketOut)
async def create_support_ticket(
    ticket_in: SupportTicketCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(current_user),
    db=Depends(get_db)
):
    ticket_id = str(uuid.uuid4())
    now_iso = datetime.now(UTC).isoformat()
    
    new_ticket = SupportTicket(
        id=ticket_id,
        title=ticket_in.title,
        description=ticket_in.description,
        category=ticket_in.category,
        status="open",
        user_id=current_user.id,
        created_at=now_iso
    )
    db.add(new_ticket)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    # Create in-app notification for the user
    import asyncio
    from app.sse_manager import notification_manager
    from app.models import Notification
    
    notif_id = str(uuid.uuid4())
    notif = Notification(
        id=notif_id,
        user_id=current_user.id,
        title="Ticket de support créé",
        message=f"Votre ticket '{ticket_in.title}' a été envoyé avec succès à notre équipe de support.",
        type="info",
        created_at=now_iso
    )
    db.add(notif)
    try:
        db.commit()
        # Broadcast via SSE
        asyncio.create_task(
            notification_manager.broadcast(
                current_user.id,
                {
                    "id": notif.id,
                    "title": notif.title,
                    "message": notif.message,
                    "type": notif.type,
                    "is_read": False,
                    "created_at": notif.created_at
                }
            )
        )
    except Exception:
        db.rollback()

    background_tasks.add_task(
        send_support_ticket_email,
        ticket_id=ticket_id,
        title=ticket_in.title,
        description=ticket_in.description,
        category=ticket_in.category,
        user_email=current_user.email or current_user.username
    )
    
    return SupportTicketOut(
        id=new_ticket.id,
        title=new_ticket.title,
        description=new_ticket.description,
        category=new_ticket.category,
        status=new_ticket.status,
        user_id=new_ticket.user_id,
        created_at=new_ticket.created_at
    )
