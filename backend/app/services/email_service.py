"""Email service for sending invitation emails."""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger("paycircle.email")

settings = get_settings()


def send_invitation_email(
    invitee_email: str,
    inviter_name: str,
    group_name: str,
    token: str,
) -> bool:
    """Send a group invitation email. Returns True on success."""
    frontend_url = settings.CORS_ORIGINS.split(",")[0].strip() if settings.CORS_ORIGINS else "http://localhost:5173"
    invite_link = f"{frontend_url}/invitations?token={token}"

    subject = f"You're invited to join \"{group_name}\" on PayCircle"

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #18181B;">
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700;">You're invited to join {group_name}</h2>
      <p style="margin: 0 0 12px; font-size: 15px; color: #52525B;">
        <strong>{inviter_name}</strong> invited you to join the PayCircle group:
      </p>
      <div style="background: #F4F4F5; border-radius: 8px; padding: 16px; margin: 0 0 16px; text-align: center;">
        <span style="font-size: 18px; font-weight: 600; color: #6C4BF4;">{group_name}</span>
      </div>
      <p style="margin: 0 0 20px; font-size: 14px; color: #52525B; line-height: 1.5;">
        Join the group to view expenses, track balances, and settle expenses with your group members.
      </p>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="{invite_link}" style="display: inline-block; background: #6C4BF4; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Accept Invitation
        </a>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #A1A1AA;">
        This invitation expires in 7 days.
      </p>
      <hr style="border: none; border-top: 1px solid #E4E4E7; margin: 16px 0;" />
      <p style="margin: 0; font-size: 13px; color: #A1A1AA;">
        — PayCircle
      </p>
    </div>
    """

    text_body = (
        f"You're invited to join {group_name}\n\n"
        f"{inviter_name} invited you to join the PayCircle group: {group_name}\n\n"
        f"Join the group to view expenses, track balances, and settle expenses.\n\n"
        f"Accept here: {invite_link}\n\n"
        f"This invitation expires in 7 days.\n\n— PayCircle"
    )

    smtp_host = getattr(settings, "SMTP_HOST", "")
    smtp_port = int(getattr(settings, "SMTP_PORT", 587))
    smtp_user = getattr(settings, "SMTP_USER", "")
    smtp_pass = getattr(settings, "SMTP_PASS", "")
    email_from = getattr(settings, "EMAIL_FROM", "") or smtp_user

    if not all([smtp_host, smtp_user, smtp_pass, email_from]):
        logger.warning(
            "Email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM missing). "
            "Invitation token: %s — link: %s", token, invite_link
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = email_from
        msg["To"] = invitee_email
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            if smtp_port != 25:
                server.starttls()
                server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(email_from, [invitee_email], msg.as_string())

        logger.info("Invitation email sent to %s for group token %s", invitee_email, token)
        return True
    except Exception:
        logger.exception("Failed to send invitation email to %s", invitee_email)
        return False
