from pathlib import Path
import logging
from email.message import EmailMessage
import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from .config import get_settings
from .i18n import catalog_for

logger = logging.getLogger(__name__)

# Initialize Jinja2 environment
template_dir = Path(__file__).parent / "templates" / "email"
env = Environment(loader=FileSystemLoader(str(template_dir)))

async def send_reset_password_email(email_to: str, user_name: str, reset_link: str, sender_email: str | None = None, language: str = "fr") -> None:
    settings = get_settings()
    
    try:
        t = catalog_for(language)
        template = env.get_template("reset_password.html")
        html_content = template.render(
            user_name=user_name,
            reset_link=reset_link,
            app_name=settings.app_name,
            t=t
        )
        
        message = EmailMessage()
        
        from_email = sender_email or settings.mail_from or 'noreply@africensus.org'
        message["From"] = f"{settings.mail_from_name or 'AfriCensus'} <{from_email}>"
        
        message["To"] = email_to
        message["Subject"] = t["email.reset.subject"]
        message.set_content("Veuillez consulter cet e-mail avec un client compatible HTML.")
        message.add_alternative(html_content, subtype="html")

        if not settings.smtp_host:
            logger.warning(f"SMTP non configuré. E-mail simulé pour {email_to} avec le lien: {reset_link}")
            return

        smtp_args = {
            "hostname": settings.smtp_host,
            "port": settings.smtp_port,
            "use_tls": not settings.smtp_tls, # if smtp_tls is True, we use starttls below
        }

        async with aiosmtplib.SMTP(**smtp_args) as smtp:
            if settings.smtp_tls and settings.smtp_port != 465:
                await smtp.starttls()
            
            if settings.smtp_user and settings.smtp_password:
                await smtp.login(settings.smtp_user, settings.smtp_password)
                
            await smtp.send_message(message)
            logger.info(f"E-mail de réinitialisation envoyé avec succès à {email_to}")

    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'e-mail de réinitialisation à {email_to}: {e}")

async def send_password_expiring_email(email_to: str, user_name: str, days_left: int, reset_link: str, sender_email: str | None = None, language: str = "fr") -> None:
    settings = get_settings()
    try:
        t = catalog_for(language)
        template = env.get_template("password_expiring.html")
        html_content = template.render(name=user_name, days_left=days_left, reset_link=reset_link, t=t)
        
        message = EmailMessage()
        from_email = sender_email or settings.mail_from or 'noreply@africensus.org'
        message["From"] = f"{settings.mail_from_name or 'AfriCensus'} <{from_email}>"
        message["To"] = email_to
        message["Subject"] = t["email.expire.subject"]
        message.set_content("Veuillez consulter cet e-mail avec un client compatible HTML.")
        message.add_alternative(html_content, subtype="html")

        if not settings.smtp_host:
            logger.warning(f"SMTP non configuré. E-mail simulé pour {email_to}")
            return

        smtp_args = {"hostname": settings.smtp_host, "port": settings.smtp_port, "use_tls": not settings.smtp_tls}
        async with aiosmtplib.SMTP(**smtp_args) as smtp:
            if settings.smtp_tls and settings.smtp_port != 465:
                await smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                await smtp.login(settings.smtp_user, settings.smtp_password)
            await smtp.send_message(message)
    except Exception as e:
        logger.error(f"Erreur envoi email expiration à {email_to}: {e}")

async def send_supervisor_password_expiring_email(email_to: str, manager_name: str, agent_name: str, days_left: int, sender_email: str | None = None, language: str = "fr") -> None:
    settings = get_settings()
    try:
        t = catalog_for(language)
        template = env.get_template("agent_password_expiring.html")
        html_content = template.render(manager_name=manager_name, agent_name=agent_name, days_left=days_left, t=t)
        
        message = EmailMessage()
        from_email = sender_email or settings.mail_from or 'noreply@africensus.org'
        message["From"] = f"{settings.mail_from_name or 'AfriCensus'} <{from_email}>"
        message["To"] = email_to
        message["Subject"] = f"{t['email.mgr.subject']} ({agent_name})"
        message.set_content("Veuillez consulter cet e-mail avec un client compatible HTML.")
        message.add_alternative(html_content, subtype="html")

        if not settings.smtp_host:
            logger.warning(f"SMTP non configuré. E-mail simulé pour {email_to}")
            return

        smtp_args = {"hostname": settings.smtp_host, "port": settings.smtp_port, "use_tls": not settings.smtp_tls}
        async with aiosmtplib.SMTP(**smtp_args) as smtp:
            if settings.smtp_tls and settings.smtp_port != 465:
                await smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                await smtp.login(settings.smtp_user, settings.smtp_password)
            await smtp.send_message(message)
    except Exception as e:
        logger.error(f"Erreur envoi email superviseur à {email_to}: {e}")

async def send_support_ticket_email(ticket_id: str, title: str, description: str, category: str, user_email: str) -> None:
    settings = get_settings()
    contact_email = settings.contact_email or settings.mail_from
    if not contact_email:
        logger.warning("Aucun e-mail de contact configuré pour recevoir les tickets.")
        return

    try:
        message = EmailMessage()
        from_email = settings.mail_from or 'noreply@africensus.org'
        message["From"] = f"{settings.mail_from_name or 'AfriCensus Support'} <{from_email}>"
        message["To"] = contact_email
        message["Subject"] = f"[Support Ticket] {category}: {title}"
        
        content = f"""
Nouveau ticket de support ({ticket_id})
Catégorie: {category}
Utilisateur: {user_email}

Titre: {title}
Description:
{description}
"""
        message.set_content(content)

        if not settings.smtp_host:
            logger.warning(f"SMTP non configuré. E-mail simulé pour le ticket {ticket_id}")
            return

        smtp_args = {"hostname": settings.smtp_host, "port": settings.smtp_port, "use_tls": not settings.smtp_tls}
        async with aiosmtplib.SMTP(**smtp_args) as smtp:
            if settings.smtp_tls and settings.smtp_port != 465:
                await smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                await smtp.login(settings.smtp_user, settings.smtp_password)
            await smtp.send_message(message)
            logger.info(f"E-mail de support envoyé pour le ticket {ticket_id}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'e-mail de support: {e}")
