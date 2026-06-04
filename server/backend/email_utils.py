import os
import smtplib
from pathlib import Path
from email.message import EmailMessage
from dotenv import load_dotenv

# Try loading .env from the server directory (one level up from backend/)
# and also the backend directory itself, so it works in all environments.
_backend_dir = Path(__file__).resolve().parent          # server/backend/
_server_dir  = _backend_dir.parent                      # server/

load_dotenv(_server_dir  / ".env")   # server/.env  ← where DATABASE_URL and SMTP vars live
load_dotenv(_backend_dir / ".env")   # server/backend/.env  ← optional override


def send_email(to_email: str, subject: str, body: str):
    smtp_host     = os.getenv("SMTP_HOST")
    smtp_port     = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL")
    smtp_from_name  = os.getenv("SMTP_FROM_NAME", "Auto Nidhi")

    if not all([smtp_host, smtp_username, smtp_password, smtp_from_email]):
        raise RuntimeError(
            "SMTP settings are not configured. "
            "Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL "
            "in environment variables (Render dashboard or .env)."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"]    = f"{smtp_from_name} <{smtp_from_email}>"
    message["To"]      = to_email
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(smtp_username, smtp_password)
        smtp.send_message(message)