"""Reusable email service for PayCircle — invitations, verification, reset, notifications."""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import get_settings

logger = logging.getLogger("paycircle.email")

settings = get_settings()

FRONTEND_URL = (
    settings.CORS_ORIGINS.split(",")[0].strip()
    if settings.CORS_ORIGINS
    else "http://localhost:5173"
)


class EmailService:
    """Send emails via SMTP. All credentials come from environment variables."""

    # ── generic send ────────────────────────────────────────────────────

    @staticmethod
    def send_email(
        to: str,
        subject: str,
        html_body: str,
        text_body: str = "",
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASS
        email_from = settings.EMAIL_FROM or smtp_user

        if not all([smtp_host, smtp_user, smtp_pass, email_from]):
            logger.warning(
                "SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM in .env"
            )
            return False

        if not text_body:
            text_body = html_body  # crude fallback

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = email_from
            msg["To"] = to
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                if smtp_port != 25:
                    server.starttls()
                    server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.sendmail(email_from, [to], msg.as_string())

            logger.info("Email sent to %s — subject: %s", to, subject)
            return True
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed — check SMTP_USER/SMTP_PASS")
            return False
        except Exception:
            logger.exception("Failed to send email to %s", to)
            return False

    # ── group invitation ────────────────────────────────────────────────

    @staticmethod
    def send_invitation_email(
        invitee_email: str,
        inviter_name: str,
        group_name: str,
        token: str,
    ) -> bool:
        invite_link = f"{FRONTEND_URL}/invitations?token={token}"
        subject = f"You're invited to join \"{group_name}\" on PayCircle"

        html_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                    max-width:520px;margin:0 auto;padding:32px 24px;color:#18181B;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">
            You're invited to join {group_name}
          </h2>
          <p style="margin:0 0 12px;font-size:15px;color:#52525B;">
            <strong>{inviter_name}</strong> invited you to join the PayCircle group:
          </p>
          <div style="background:#F4F4F5;border-radius:8px;padding:16px;
                      margin:0 0 16px;text-align:center;">
            <span style="font-size:18px;font-weight:600;color:#6C4BF4;">
              {group_name}
            </span>
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:#52525B;line-height:1.5;">
            Join the group to view expenses, track balances, and settle expenses
            with your group members.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="{invite_link}" style="display:inline-block;background:#6C4BF4;
               color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;
               font-weight:600;font-size:15px;">
              Accept Invitation
            </a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#A1A1AA;">
            This invitation expires in 7 days.
          </p>
          <hr style="border:none;border-top:1px solid #E4E4E7;margin:16px 0;" />
          <p style="margin:0;font-size:13px;color:#A1A1AA;">— PayCircle</p>
        </div>
        """

        text_body = (
            f"You're invited to join {group_name}\n\n"
            f"{inviter_name} invited you to join the PayCircle group: {group_name}\n\n"
            f"Join the group to view expenses, track balances, and settle expenses.\n\n"
            f"Accept here: {invite_link}\n\n"
            f"This invitation expires in 7 days.\n\n— PayCircle"
        )

        ok = EmailService.send_email(invitee_email, subject, html_body, text_body)
        if not ok:
            logger.warning(
                "Could not send invitation email — token: %s — link: %s",
                token, invite_link,
            )
        return ok

    # ── email verification (future) ─────────────────────────────────────

    @staticmethod
    def send_verification_email(
        user_email: str,
        user_name: str,
        verify_token: str,
    ) -> bool:
        verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}"
        subject = "Verify your PayCircle email address"

        html_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                    max-width:520px;margin:0 auto;padding:32px 24px;color:#18181B;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Verify your email</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#52525B;">
            Hi {user_name}, click the button below to verify your email address.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="{verify_link}" style="display:inline-block;background:#6C4BF4;
               color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;
               font-weight:600;font-size:15px;">
              Verify Email
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#A1A1AA;">
            This link expires in 24 hours.
          </p>
        </div>
        """

        text_body = (
            f"Hi {user_name},\n\n"
            f"Verify your email: {verify_link}\n\n"
            f"This link expires in 24 hours."
        )

        return EmailService.send_email(user_email, subject, html_body, text_body)

    # ── password reset (future) ─────────────────────────────────────────

    @staticmethod
    def send_password_reset_email(
        user_email: str,
        user_name: str,
        reset_token: str,
    ) -> bool:
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        subject = "Reset your PayCircle password"

        html_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                    max-width:520px;margin:0 auto;padding:32px 24px;color:#18181B;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">Password reset</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#52525B;">
            Hi {user_name}, click the button below to reset your password.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="{reset_link}" style="display:inline-block;background:#6C4BF4;
               color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;
               font-weight:600;font-size:15px;">
              Reset Password
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#A1A1AA;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
          </p>
        </div>
        """

        text_body = (
            f"Hi {user_name},\n\n"
            f"Reset your password: {reset_link}\n\n"
            f"This link expires in 1 hour. If you didn't request this, ignore this email."
        )

        return EmailService.send_email(user_email, subject, html_body, text_body)

    # ── general notification (future) ───────────────────────────────────

    @staticmethod
    def send_notification_email(
        to: str,
        subject: str,
        heading: str,
        body: str,
    ) -> bool:
        html_body = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                    max-width:520px;margin:0 auto;padding:32px 24px;color:#18181B;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;">{heading}</h2>
          <p style="margin:0 0 20px;font-size:15px;color:#52525B;line-height:1.5;">
            {body}
          </p>
          <hr style="border:none;border-top:1px solid #E4E4E7;margin:16px 0;" />
          <p style="margin:0;font-size:13px;color:#A1A1AA;">— PayCircle</p>
        </div>
        """
        return EmailService.send_email(to, subject, html_body, body)

    # ── SMTP connectivity check ─────────────────────────────────────────

    @staticmethod
    def test_connection() -> dict:
        """Test SMTP login without sending any email. Returns status dict."""
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASS

        if not all([smtp_host, smtp_user, smtp_pass]):
            return {
                "ok": False,
                "error": "SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS in .env",
            }

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                if smtp_port != 25:
                    server.starttls()
                    server.ehlo()
                server.login(smtp_user, smtp_pass)
            logger.info("SMTP connection test passed for %s:%s", smtp_host, smtp_port)
            return {"ok": True, "host": smtp_host, "port": smtp_port, "user": smtp_user}
        except smtplib.SMTPAuthenticationError:
            msg = "SMTP authentication failed — check SMTP_USER and SMTP_PASS"
            logger.error(msg)
            return {"ok": False, "error": msg}
        except Exception as exc:
            msg = f"SMTP connection failed: {exc}"
            logger.exception(msg)
            return {"ok": False, "error": msg}


# ── convenience re-exports so existing callers don't break ──────────────
# invitation_service.py does: from app.services.email_service import send_invitation_email
send_invitation_email = EmailService.send_invitation_email
