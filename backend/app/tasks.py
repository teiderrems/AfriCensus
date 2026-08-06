import logging
from datetime import datetime, timedelta, timezone
import uuid
import asyncio

from .database import SessionLocal
from .models import User, Notification
from .email_service import send_password_expiring_email, send_supervisor_password_expiring_email
from .i18n import catalog_for
from .sse_manager import notification_manager
from .config import get_settings

logger = logging.getLogger(__name__)


async def check_expiring_passwords():
    """
    Tâche quotidienne pour prévenir les utilisateurs dont le mot de passe expire bientôt.
    Vérifie les utilisateurs dont le password_changed_at date de 83 à 89 jours (expiration à 90 jours).
    """
    logger.info("Démarrage de la vérification des mots de passe expirant...")
    try:
        with SessionLocal() as db:
            users = db.query(User).filter(User.active == True, User.password_changed_at.isnot(None)).all()
            now = datetime.now(timezone.utc)
            
            for user in users:
                if user.force_password_change:
                    continue
                    
                try:
                    changed_date = datetime.fromisoformat(user.password_changed_at.replace("Z", "+00:00"))
                    if changed_date.tzinfo is None:
                        changed_date = changed_date.replace(tzinfo=timezone.utc)
                        
                    days_passed = (now - changed_date).days
                    days_left = 90 - days_passed
                    
                    if 1 <= days_left <= 7:
                        # Create Notification if not already created today
                        # Simple logic: check if a notification of type 'PASSWORD_EXPIRING' was created today
                        today_str = now.strftime("%Y-%m-%d")
                        existing_notif = db.query(Notification).filter(
                            Notification.user_id == user.id,
                            Notification.type == "PASSWORD_EXPIRING",
                            Notification.created_at.like(f"{today_str}%")
                        ).first()
                        
                        if not existing_notif:
                            # 1. Save in-app notification
                            t_user = catalog_for(getattr(user, "preferred_language", "fr"))
                            notif = Notification(
                                id=str(uuid.uuid4()),
                                user_id=user.id,
                                title=t_user.get("email.expire.subject", "Expiration de mot de passe"),
                                message=f"{t_user.get('email.expire.body1', '')} {days_left} {t_user.get('email.expire.body2', '')}. {t_user.get('email.expire.button', '')}.",
                                type="PASSWORD_EXPIRING",
                                created_at=now.isoformat()
                            )
                            db.add(notif)
                            db.commit()
                            db.refresh(notif)
                            
                            # Broadcast to SSE
                            asyncio.create_task(notification_manager.broadcast(user.id, notif.to_dict()))
                            
                            # 2. Find managers to notify
                            managers = []
                            if user.role == "AGENT":
                                if user.zone_ids:
                                    all_supervisors = db.query(User).filter(User.role == "SUPERVISOR", User.active == True).all()
                                    for sup in all_supervisors:
                                        if set(user.zone_ids) & set(sup.zone_ids):
                                            managers.append(sup)
                            elif user.role == "SUPERVISOR":
                                managers = db.query(User).filter(User.role == "ADMIN", User.active == True).all()
                            
                            for mgr in managers:
                                existing_mgr_notif = db.query(Notification).filter(
                                    Notification.user_id == mgr.id,
                                    Notification.type == "AGENT_PASSWORD_EXPIRING",
                                    Notification.message.like(f"%{user.full_name}%"),
                                    Notification.created_at.like(f"{today_str}%")
                                ).first()
                                
                                if not existing_mgr_notif:
                                    t_mgr = catalog_for(getattr(mgr, "preferred_language", "fr"))
                                    mgr_notif = Notification(
                                        id=str(uuid.uuid4()),
                                        user_id=mgr.id,
                                        title=t_mgr.get("email.mgr.subject", "Alerte : Expiration de mot de passe"),
                                        message=f"{t_mgr.get('email.mgr.body1', '')} {user.full_name} {t_mgr.get('email.mgr.body2', '')} {days_left} {t_mgr.get('email.expire.body2', '')}.",
                                        type="AGENT_PASSWORD_EXPIRING",
                                        created_at=now.isoformat()
                                    )
                                    db.add(mgr_notif)
                                    db.commit()
                                    db.refresh(mgr_notif)
                                    
                                    # Broadcast to SSE
                                    asyncio.create_task(notification_manager.broadcast(mgr.id, mgr_notif.to_dict()))
                                    
                                    if mgr.email:
                                        asyncio.create_task(
                                            send_supervisor_password_expiring_email(mgr.email, mgr.full_name, user.full_name, days_left, language=getattr(mgr, "preferred_language", "fr"))
                                        )

                            db.commit()
                            
                            settings = get_settings()
                            forgot_url = f"{settings.frontend_public_url.rstrip('/')}/forgot-password"
                            if user.email:
                                asyncio.create_task(
                                    send_password_expiring_email(user.email, user.full_name, days_left, forgot_url, language=getattr(user, "preferred_language", "fr"))
                                )
                            logger.info(f"Notification d'expiration envoyée à {user.username} (reste {days_left} jours)")

                except Exception as e:
                    logger.error(f"Erreur lors du traitement de l'utilisateur {user.id}: {e}")

    except Exception as e:
        logger.error(f"Erreur globale dans check_expiring_passwords: {e}")
