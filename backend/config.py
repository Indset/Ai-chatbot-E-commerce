"""
Backend configuration for NegotiateHub.

Place SMTP credentials here or set environment variables in production.
If SMTP is not configured, login notifications will be written to
`backend/logs/login_notifications.log` (best-effort local fallback).
"""
from pathlib import Path
import os

# Notification recipient (your requested address)
NOTIFY_EMAIL = os.environ.get('NOTIFY_EMAIL', 'mdkamran9708@gmail.com')

# Email sender
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'no-reply@negotiatehub.local')

# SMTP Configuration - set these in environment or edit here
SMTP_HOST = os.environ.get('SMTP_HOST', '')  # e.g. smtp.gmail.com
SMTP_PORT = int(os.environ.get('SMTP_PORT', '0'))  # e.g. 587
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')

# Local fallback log path
LOG_DIR = Path(__file__).resolve().parents[0] / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOGIN_NOTIFICATION_LOG = LOG_DIR / 'login_notifications.log'

